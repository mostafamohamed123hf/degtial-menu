// Admin authentication controller
const Customer = require("../models/Customer");
const Role = require("../models/Role");
const jwt = require("jsonwebtoken");

// @desc    Admin login with hardcoded credentials or customer with admin permissions
// @route   POST /api/auth/admin/login
// @access  Public
exports.adminLogin = async (req, res) => {
  try {
    console.log("Admin login attempt with data:", {
      username: req.body.username,
      email: req.body.email || "(not provided)",
      passwordProvided: !!req.body.password,
      headers: req.headers,
    });

    // Get username/email and password from request body
    const { username, email, password } = req.body;

    // Use either username or email for authentication
    const identifier = username || email;

    console.log(`Using identifier: ${identifier} for authentication`);

    if (!identifier || !password) {
      console.log("Missing credentials");
      return res.status(400).json({
        success: false,
        message: "Please provide username/email and password",
      });
    }

    // Get admin credentials from environment variables only - no default fallback
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    console.log("Checking against admin credentials");

    // Only check admin credentials if both environment variables are set
    if (
      ADMIN_USERNAME &&
      ADMIN_PASSWORD &&
      identifier === ADMIN_USERNAME &&
      password === ADMIN_PASSWORD
    ) {
      console.log("Main admin credentials matched");
      // Generate admin token
      const token = `admin_${Date.now()}`;

      // Send token in both response and cookie
      res.cookie("token", token, {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax", // Allows cookies in cross-origin requests
      });

      res.status(200).json({
        success: true,
        token,
        user: {
          displayName: "Admin User",
          role: "admin",
          permissions: {
            stats: true,
            productsView: true,
            productsEdit: true,
            vouchersView: true,
            vouchersEdit: true,
            tax: true,
            qr: true,
            users: true,
          },
        },
      });
      return;
    }

    console.log(
      "Main admin credentials did not match or not configured, checking for customer with admin panel permission"
    );

    // If not admin credentials, check for customer with admin permissions
    // Try to find customer by username or email, include permissions field
    const customer = await Customer.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    }).select("+password");

    console.log(
      "Customer lookup result:",
      customer
        ? {
            id: customer._id,
            email: customer.email,
            username: customer.username,
            passwordExists: !!customer.password,
            permissions: customer.permissions || {},
            roleId: customer.roleId,
          }
        : "No customer found"
    );

    // If customer not found, return error
    if (!customer) {
      console.log("No customer found with the provided username/email");
      return res.status(200).json({
        success: false,
        message: "Invalid admin credentials - no customer found",
      });
    }

    // Check if password matches
    console.log("Checking password match");
    const isMatch = await customer.matchPassword(password);

    console.log("Password match result:", isMatch);

    if (!isMatch) {
      console.log("Password doesn't match");
      return res.status(200).json({
        success: false,
        message: "Invalid password",
      });
    }

    // First check if customer has direct admin panel permission
    let hasAdminAccess =
      customer.permissions && customer.permissions.adminPanel;
    let permissions = customer.permissions || {};

    // If customer doesn't have direct admin permission, check if their role has admin access
    if (!hasAdminAccess && customer.roleId) {
      console.log(
        "Customer doesn't have direct admin permission, checking role permissions"
      );

      // Fetch the role to check its permissions
      const role = await Role.findById(customer.roleId);

      if (role && role.permissions && role.permissions.adminPanel) {
        console.log("Customer's role has admin panel permission:", role.name);
        console.log("Role permissions:", role.permissions);
        hasAdminAccess = true;
        // Merge role permissions with customer permissions, with role permissions taking precedence
        permissions = { ...permissions, ...role.permissions };
      }
    }

    if (!hasAdminAccess) {
      console.log("Customer and their role don't have admin panel permission");
      return res.status(200).json({
        success: false,
        message: "Account does not have admin panel permission",
      });
    }

    console.log(
      "Customer has admin access through direct permission or role, generating JWT token"
    );

    // Customer has admin access, generate JWT token
    const secret = process.env.JWT_SECRET || "your_default_jwt_secret";
    console.log(
      "Using JWT secret:",
      secret ? `${secret.substring(0, 3)}...` : "No secret available"
    );

    const token = jwt.sign(
      {
        id: customer._id,
        role: "customer_admin",
        name: customer.name,
      },
      secret,
      {
        expiresIn: "24h",
      }
    );

    // Update last login time
    customer.lastLogin = Date.now();
    await customer.save();

    console.log("Token generated successfully");

    // Send token in both response and cookie
    res.cookie("token", token, {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Allows cookies in cross-origin requests
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: customer._id,
        displayName: customer.name,
        email: customer.email,
        role: "customer_admin",
        permissions: permissions,
        roleName: customer.roleName || "مستخدم إداري",
      },
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// @desc    Get admin status
// @route   GET /api/auth/admin/status
// @access  Private (admin only)
exports.getAdminStatus = async (req, res) => {
  try {
    // Since we're using the protect middleware, if execution reaches here,
    // the request is authenticated as admin
    res.status(200).json({
      success: true,
      data: {
        isAdmin: true,
        adminUser: req.user,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Admin logout / clear cookie
// @route   GET /api/auth/admin/logout
// @access  Public
exports.adminLogout = (req, res) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000), // 10 seconds
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    data: {},
    message: "Logged out successfully",
  });
};

// @desc    Get CSRF token
// @route   GET /api/auth/csrf-token
// @access  Public
exports.getCsrfToken = (req, res) => {
  // Generate a simple CSRF token
  // In production, you might want to use a more sophisticated token generation
  const csrfToken = `csrf_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  res.status(200).json({
    success: true,
    csrfToken: csrfToken,
  });
};
