const rateLimit = require("express-rate-limit");

// Create a general API rate limiter
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message:
      "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// More strict limiter for public authentication/validation endpoints
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1000, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message:
      "Too many attempts from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Specific limiter for voucher validation
const voucherLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // Limit each IP to 10 voucher validation attempts per minute
  message: {
    success: false,
    message:
      "Too many voucher attempts from this IP, please try again after 1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  voucherLimiter,
};
