<<<<<<< HEAD
/**
 * Async handler middleware
 * Wraps async controller functions to handle errors without repetitive try-catch blocks
 * @param {Function} fn - The async controller function to wrap
 * @returns {Function} - Express middleware function with error handling
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
=======
/**
 * Async handler middleware
 * Wraps async controller functions to handle errors without repetitive try-catch blocks
 * @param {Function} fn - The async controller function to wrap
 * @returns {Function} - Express middleware function with error handling
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
>>>>>>> e17e82634e94e59ba130b332d7929f60eb408654
