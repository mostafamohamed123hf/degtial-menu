/**
 * Async handler middleware
 * Wraps async controller functions to handle errors without repetitive try-catch blocks
 * @param {Function} fn - The async controller function to wrap
 * @returns {Function} - Express middleware function with error handling
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
