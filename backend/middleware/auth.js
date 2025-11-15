const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Role = require("../models/Role");

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  // Check headers for authorization token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(" ")[1];
  }
  // If token is in cookies
  else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return res.status(200).json({
      success: false,
      message: "Not authorized to access this route",
    });
  }

  try {
    // Admin token format (admin_timestamp)
    if (token.startsWith("admin_")) {
      // For admin token, we'll create a mock admin user with a valid ObjectId
      const adminId = new mongoose.Types.ObjectId("000000000000000000000000");

      req.user = {
        _id: adminId,
        name: "Admin",
        email: "admin@example.com",
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
          adminPanel: true,
        },
      };

      return next();
    }
    // JWT token (for customer with admin access)
    else {
      try {
        // Verify token
        const secret = process.env.JWT_SECRET || "your_default_jwt_secret";
        const decoded = jwt.verify(token, secret);

        // Check if this is a customer with admin role
        if (decoded && decoded.role === "customer_admin") {
          // Find the customer to verify they still have admin panel permissions
          const customer = await Customer.findById(decoded.id);

          if (!customer) {
            return res.status(200).json({
              success: false,
              message: "Customer not found",
            });
          }

          // First check if they have direct admin panel permission
          let hasAdminAccess =
            customer.permissions && customer.permissions.adminPanel;
          let permissions = customer.permissions || {};

          // If they don't have direct permission, check their role
          if (!hasAdminAccess && customer.roleId) {
            // Fetch the role to check its permissions
            const role = await Role.findById(customer.roleId);

            if (role && role.permissions && role.permissions.adminPanel) {
              hasAdminAccess = true;
              // Merge role permissions with customer permissions, with role permissions taking precedence
              permissions = { ...permissions, ...role.permissions };
            }
          }

          // Check if they have admin panel permission (either direct or through role)
          if (!hasAdminAccess) {
            return res.status(200).json({
              success: false,
              message: "Admin access revoked - No adminPanel permission",
            });
          }

          // Set user data
          req.user = {
            _id: customer._id,
            name: customer.name,
            email: customer.email,
            role: "admin", // Treat as admin for authorization purposes
            permissions: permissions,
            roleName: customer.roleName || "مستخدم إداري",
          };

          return next();
        }

        // If not a customer_admin token, reject access
        return res.status(200).json({
          success: false,
          message: "Invalid token type",
        });
      } catch (jwtError) {
        console.error("JWT verification error:", jwtError);
        return res.status(200).json({
          success: false,
          message: "Invalid or expired token",
        });
      }
    }
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(200).json({
      success: false,
      message: "Not authorized to access this route",
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};

// Check specific permission
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    // For admin role, always allow access
    if (req.user.role === "admin") {
      return next();
    }

    // Check if user has required permission
    if (!req.user.permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
};
