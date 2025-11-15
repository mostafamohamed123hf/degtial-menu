const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");

// Protect routes - only for customers
exports.protectCustomer = async (req, res, next) => {
  let token;

  try {
    // Check for token in Authorization header or cookies
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      // Set token from Bearer token in header
      token = req.headers.authorization.split(" ")[1];

      // Verify that token exists and isn't just whitespace
      if (!token || token.trim() === "") {
        return res.status(200).json({
          success: false,
          message: "Authorization token is missing",
        });
      }
    } else if (req.cookies && req.cookies.token) {
      // Set token from cookie
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
      // Verify token
      const secret = process.env.JWT_SECRET || "your_default_jwt_secret";
      const decoded = jwt.verify(token, secret);

      // Check if user has customer role
      if (!decoded || decoded.role !== "customer") {
        return res.status(403).json({
          success: false,
          message: "Not authorized as a customer",
        });
      }

      // Get customer from the token id
      req.customer = await Customer.findById(decoded.id);

      if (!req.customer) {
        return res.status(200).json({
          success: false,
          message: "Customer not found",
        });
      }

      next();
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError.message);

      // Handle specific JWT errors
      if (jwtError.name === "JsonWebTokenError") {
        return res.status(200).json({
          success: false,
          message: "Invalid authentication token",
        });
      } else if (jwtError.name === "TokenExpiredError") {
        return res.status(200).json({
          success: false,
          message: "Authentication token expired",
        });
      } else {
        return res.status(200).json({
          success: false,
          message: "Authentication failed",
        });
      }
    }
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication",
    });
  }
};

// Optional protect - doesn't require authentication but populates req.customer if token exists
exports.optionalProtectCustomer = async (req, res, next) => {
  let token;

  try {
    // Check for token in Authorization header or cookies
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // If token exists, try to verify it
    if (token && token.trim() !== "") {
      try {
        const secret = process.env.JWT_SECRET || "your_default_jwt_secret";
        const decoded = jwt.verify(token, secret);

        // Check if user has customer role
        if (decoded && decoded.role === "customer") {
          // Get customer from the token id
          req.customer = await Customer.findById(decoded.id);
        }
      } catch (jwtError) {
        // If token is invalid, just continue without authentication
        console.log("Optional auth: Invalid or expired token, continuing without auth");
      }
    }

    // Always continue, whether authenticated or not
    next();
  } catch (err) {
    console.error("Optional auth middleware error:", err);
    // Continue even if there's an error
    next();
  }
};
