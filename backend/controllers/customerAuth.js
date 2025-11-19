const Customer = require("../models/Customer");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const nodemailer = require("nodemailer");

// @desc    Register customer
// @route   POST /api/customer/register
// @access  Public
exports.register = async (req, res) => {
  try {
    // Validate input fields
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { name, username, email, password, termsAccepted } = req.body;

    // Ensure terms are accepted
    if (!termsAccepted) {
      return res.status(400).json({
        success: false,
        message: "You must accept the terms and conditions",
      });
    }

    // Check if customer already exists with this email
    const existingCustomerEmail = await Customer.findOne({ email });

    if (existingCustomerEmail) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // Check if customer already exists with this username
    const existingCustomerUsername = await Customer.findOne({ username });

    if (existingCustomerUsername) {
      return res.status(400).json({
        success: false,
        message: "This username is already taken",
      });
    }

    // Create customer with 50 free loyalty points
    const customer = await Customer.create({
      name,
      username,
      email,
      password,
      termsAccepted,
      loyaltyPoints: 50,
    });

    // Send token response
    sendTokenResponse(customer, 201, res);
  } catch (err) {
    console.error("Error registering customer:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Login customer
// @route
// @access  Public
exports.login = async (req, res) => {
  try {
    console.log("Login attempt with data:", {
      email: req.body.email,
      passwordProvided: !!req.body.password,
    });

    // Validate input fields
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array());
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
      console.log("Missing required fields");
      return res.status(400).json({
        success: false,
        message: "Please provide an email and password",
      });
    }

    // Check for customer
    const customer = await Customer.findOne({ email }).select("+password");

    if (!customer) {
      console.log(`No customer found with email: ${email}`);
      return res.status(200).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    console.log(`Customer found: ${customer._id}, checking password match`);

    // Check if password matches
    const isMatch = await customer.matchPassword(password);

    if (!isMatch) {
      console.log("Password doesn't match");
      return res.status(200).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    console.log("Password matched, updating last login time");

    // Update last login time
    customer.lastLogin = Date.now();
    await customer.save();

    console.log("Sending token response");

    // Send token response
    sendTokenResponse(customer, 200, res);
  } catch (err) {
    console.error("Error logging in customer:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get current logged in customer
// @route   GET /api/customer/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer.id);

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Log customer out / clear cookie
// @route   GET /api/customer/logout
// @access  Private
exports.logout = (req, res) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    data: {},
  });
};

// @desc    Update customer profile
// @route   PUT /api/customer/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    // Find the customer
    const customer = await Customer.findById(req.customer.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Update fields
    if (name) customer.name = name;
    if (phone) customer.phone = phone;
    if (address) customer.address = address;

    await customer.save();

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (err) {
    console.error("Error updating customer profile:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Refresh authentication token
// @route   POST /api/customer/refresh-token
// @access  Private
exports.refreshToken = async (req, res) => {
  try {
    // The customer is already authenticated by the middleware
    // Just get customer from request and create a new token
    const customer = await Customer.findById(req.customer.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Update last activity time
    customer.lastLogin = Date.now();
    await customer.save();

    // Send token response with new token
    sendTokenResponse(customer, 200, res);
  } catch (err) {
    console.error("Error refreshing token:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Request password reset
// @route   POST /api/customer/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const customer = await Customer.findOne({ email: req.body.email });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "There is no account with that email address",
      });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    customer.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetCode)
      .digest("hex");

    // Set expire
    customer.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes

    await customer.save();

    try {
      const smtpUrl = process.env.SMTP_URL || "";
      const service = process.env.SMTP_SERVICE || ""; // e.g. 'gmail'
      const host = process.env.SMTP_HOST || "";
      const portRaw = process.env.SMTP_PORT || "";
      const port = portRaw ? parseInt(portRaw, 10) : undefined;
      const secureEnv = (process.env.SMTP_SECURE || "").toLowerCase();
      let secure = secureEnv === "true" || (!!port && port === 465);
      const user = process.env.SMTP_USER || "";
      const pass = process.env.SMTP_PASS || "";
      const from = process.env.SMTP_FROM || user || "noreply@digital-menu.local";

      let transporter;
      if (smtpUrl) {
        transporter = nodemailer.createTransport(smtpUrl);
      } else if (service) {
        transporter = nodemailer.createTransport({ service, auth: { user, pass } });
      } else if (host && port) {
        transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
      } else if (user && user.endsWith("@gmail.com")) {
        transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
      } else {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass },
        });
      }

      const origin = (req.headers.origin || "").trim();
      const baseUrl = origin && origin.startsWith("http")
        ? origin
        : (process.env.PUBLIC_BASE_URL || "http://localhost:5000");
      const lang = (req.body && req.body.language === "en") ? "en" : "ar";
      const resetLink = `${baseUrl}/public/pages/register.html?mode=recover&email=${encodeURIComponent(customer.email)}&code=${encodeURIComponent(resetCode)}&lang=${lang}`;

      const brandColor = "#42d158";
      const mailText = lang === "en"
        ? `Password Reset\n\nYour verification code: ${resetCode}\nThis code expires in 30 minutes.\nReset directly: ${resetLink}`
        : `إعادة تعيين كلمة المرور\n\nرمز التأكيد الخاص بك: ${resetCode}\nهذا الرمز صالح لمدة 30 دقيقة.\nإعادة التعيين مباشرة: ${resetLink}`;
      const mailHtml = lang === "en"
        ? `
        <div style="background:#f7f7fc;padding:24px;font-family:Tahoma,Arial,sans-serif">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,0.08);overflow:hidden">
            <div style="background:${brandColor};color:#fff;padding:18px 22px;font-weight:700;font-size:18px;letter-spacing:.3px">Digital Menu</div>
            <div style="padding:22px">
              <div style="direction:ltr;text-align:left">
                <h2 style="margin:0 0 8px 0;color:#2c3e50;font-size:20px">Reset your password</h2>
                <p style="margin:0 0 12px 0;color:#4b5563;font-size:14px">Use the verification code below to reset your password.</p>
                <div style="display:inline-block;background:#f3f4f6;color:#111827;border:1px solid #e5e7eb;border-radius:10px;padding:10px 18px;font-size:22px;font-weight:700;letter-spacing:2px">${resetCode}</div>
                <div style="height:14px"></div>
                <a href="${resetLink}" style="display:inline-block;background:${brandColor};color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;font-size:14px">Reset Password</a>
                <p style="margin:12px 0 0 0;color:#6b7280;font-size:12px">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break:break-all;color:#374151;font-size:12px;margin:6px 0 0 0">${resetLink}</p>
                <p style="margin:12px 0 0 0;color:#6b7280;font-size:12px">This code expires in 30 minutes</p>
              </div>
            </div>
          </div>
        </div>`
        : `
        <div style="background:#f7f7fc;padding:24px;font-family:Tahoma,Arial,sans-serif">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,0.08);overflow:hidden">
            <div style="background:${brandColor};color:#fff;padding:18px 22px;font-weight:700;font-size:18px;letter-spacing:.3px">Digital Menu</div>
            <div style="padding:22px">
              <div style="direction:rtl;text-align:right">
                <h2 style="margin:0 0 8px 0;color:#2c3e50;font-size:20px">إعادة تعيين كلمة المرور</h2>
                <p style="margin:0 0 12px 0;color:#4b5563;font-size:14px">استخدم رمز التأكيد أدناه لإعادة تعيين كلمة المرور.</p>
                <div style="display:inline-block;background:#f3f4f6;color:#111827;border:1px solid #e5e7eb;border-radius:10px;padding:10px 18px;font-size:22px;font-weight:700;letter-spacing:2px">${resetCode}</div>
                <div style="height:14px"></div>
                <a href="${resetLink}" style="display:inline-block;background:${brandColor};color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;font-size:14px">تغيير كلمة المرور</a>
                <p style="margin:12px 0 0 0;color:#6b7280;font-size:12px">إذا لم يعمل الزر، انسخ الرابط التالي والصقه في المتصفح:</p>
                <p style="word-break:break-all;color:#374151;font-size:12px;margin:6px 0 0 0">${resetLink}</p>
                <p style="margin:12px 0 0 0;color:#6b7280;font-size:12px">هذا الرمز صالح لمدة 30 دقيقة</p>
              </div>
            </div>
          </div>
        </div>`;

      const info = await transporter.sendMail({
        from,
        to: customer.email,
        subject:
          lang === "en"
            ? "Password Reset Code"
            : "رمز إعادة تعيين كلمة المرور",
        text: mailText,
        html: mailHtml,
      });
      if (!info || !info.accepted || info.accepted.length === 0) {
        throw new Error("Email was not accepted by SMTP server");
      }
      try {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log("Ethereal preview:", previewUrl);
        }
      } catch (_) {}
    } catch (mailErr) {
      console.error("Email send error:", mailErr.message);
      return res.status(500).json({
        success: false,
        message: "Failed to send reset code. Please try again later.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset code sent to your email",
    });
  } catch (err) {
    console.error("Error requesting password reset:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Reset password using token
// @route   POST /api/customer/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, password } = req.body;
    if (!email || !code || !password || String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Invalid token or password",
      });
    }
    const hashed = crypto.createHash("sha256").update(code).digest("hex");
    const customer = await Customer.findOne({
      email,
      resetPasswordToken: hashed,
      resetPasswordExpire: { $gt: Date.now() },
    }).select("+password");
    if (!customer) {
      return res.status(400).json({
        success: false,
        message: "Token invalid or expired",
      });
    }
    customer.password = password;
    customer.resetPasswordToken = undefined;
    customer.resetPasswordExpire = undefined;
    await customer.save();
    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Toggle admin access for a customer
// @route   PUT /api/customer/accounts/:id/admin-access
// @access  Private (Admin only)
exports.toggleAdminAccess = async (req, res) => {
  try {
    const customerId = req.params.id;
    const { hasAdminAccess } = req.body;

    // Validate input - hasAdminAccess must be a boolean
    if (typeof hasAdminAccess !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "hasAdminAccess must be a boolean value",
      });
    }

    // Find customer by ID
    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Update the admin access permission
    customer.hasAdminAccess = hasAdminAccess;
    await customer.save();

    res.status(200).json({
      success: true,
      data: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        hasAdminAccess: customer.hasAdminAccess,
      },
      message: hasAdminAccess
        ? "Admin access granted to customer"
        : "Admin access revoked from customer",
    });
  } catch (err) {
    console.error("Error toggling admin access:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Helper function to send JWT token response
const sendTokenResponse = (customer, statusCode, res) => {
  try {
    console.log(`Generating token for customer: ${customer._id}`);

    // Create token
    const token = customer.getSignedJwtToken();

    console.log(
      `Token generated successfully: ${
        token ? "token exists" : "token missing"
      }`
    );

    // Verify token is a string
    if (!token || typeof token !== "string") {
      console.error("Token generation error: Token is not a string or is null");
      return res.status(500).json({
        success: false,
        message: "Error generating authentication token",
      });
    }

    // Set cookie options
    const options = {
      expires: new Date(
        Date.now() + (process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
    };

    // Add secure flag in production
    if (process.env.NODE_ENV === "production") {
      options.secure = true;
    }

    console.log("Sending response with token");

    // Send response with token in both cookie and JSON response
    res.status(statusCode).cookie("token", token, options).json({
      success: true,
      token,
    });
  } catch (err) {
    console.error("Error in sendTokenResponse:", err);
    res.status(500).json({
      success: false,
      message: "Error generating authentication token",
    });
  }
};
