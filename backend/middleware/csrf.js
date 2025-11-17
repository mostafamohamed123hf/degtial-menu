<<<<<<< HEAD
/**
 * CSRF Protection middleware
 *
 * This middleware implements CSRF protection for our API by:
 * 1. Checking for a valid Origin or Referer header from our allowed domains
 * 2. Implementing a simpler alternative to traditional CSRF tokens for APIs
 */

// Helper function to check if an origin is allowed
const isOriginAllowed = (origin) => {
  if (!origin) return false;

  // Get allowed origins from environment variable or use defaults
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : [
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
      ];

  return allowedOrigins.some((allowed) => origin.startsWith(allowed));
};

// CSRF protection middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF check for GET, HEAD, OPTIONS requests (they should be idempotent)
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Check for X-CSRF-Token header (our client will send this)
  const csrfToken = req.headers["x-csrf-token"];
  if (csrfToken) {
    // In a real implementation, we would validate the token
    // For now, just accept any non-empty token as valid
    return next();
  }

  // Get origin and referer from headers
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // Check if origin or referer is from an allowed domain
  if (origin && isOriginAllowed(origin)) {
    return next();
  }

  if (referer && isOriginAllowed(referer)) {
    return next();
  }

  // If we're in development mode, allow the request
  if (process.env.NODE_ENV === "development") {
    console.warn("CSRF check bypassed in development mode");
    return next();
  }

  // If API key is provided (for programmatic access), allow the request
  const apiKey = req.headers["x-api-key"];
  if (apiKey && apiKey === process.env.API_KEY) {
    return next();
  }

  // Otherwise reject the request
  return res.status(403).json({
    success: false,
    message: "CSRF validation failed. Request denied.",
  });
};

module.exports = csrfProtection;
=======
/**
 * CSRF Protection middleware
 *
 * This middleware implements CSRF protection for our API by:
 * 1. Checking for a valid Origin or Referer header from our allowed domains
 * 2. Implementing a simpler alternative to traditional CSRF tokens for APIs
 */

// Helper function to check if an origin is allowed
const isOriginAllowed = (origin) => {
  if (!origin) return false;

  // Get allowed origins from environment variable or use defaults
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : [
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "https://degtial-menu.vercel.app",
      ];

  return allowedOrigins.some((allowed) => origin.startsWith(allowed));
};

// CSRF protection middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF check for GET, HEAD, OPTIONS requests (they should be idempotent)
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Check for X-CSRF-Token header (our client will send this)
  const csrfToken = req.headers["x-csrf-token"];
  if (csrfToken) {
    // In a real implementation, we would validate the token
    // For now, just accept any non-empty token as valid
    return next();
  }

  // Get origin and referer from headers
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // Check if origin or referer is from an allowed domain
  if (origin && isOriginAllowed(origin)) {
    return next();
  }

  if (referer && isOriginAllowed(referer)) {
    return next();
  }

  // If we're in development mode, allow the request
  if (process.env.NODE_ENV === "development") {
    console.warn("CSRF check bypassed in development mode");
    return next();
  }

  // If API key is provided (for programmatic access), allow the request
  const apiKey = req.headers["x-api-key"];
  if (apiKey && apiKey === process.env.API_KEY) {
    return next();
  }

  // Otherwise reject the request
  return res.status(403).json({
    success: false,
    message: "CSRF validation failed. Request denied.",
  });
};

module.exports = csrfProtection;
>>>>>>> e17e82634e94e59ba130b332d7929f60eb408654
