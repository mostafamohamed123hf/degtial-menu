const express = require("express");
const router = express.Router();
const {
  adminLogin,
  adminLogout,
  getAdminStatus,
  getCsrfToken,
} = require("../controllers/auth");
const { protect } = require("../middleware/auth");

// Get CSRF token (public route)
router.get("/csrf-token", getCsrfToken);

// Admin login
router.post("/admin/login", adminLogin);

// Admin logout
router.get("/admin/logout", adminLogout);

// Get admin status
router.get("/admin/status", protect, getAdminStatus);

module.exports = router;
