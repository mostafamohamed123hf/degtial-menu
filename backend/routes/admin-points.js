const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  getPointsHistory,
  addPoints,
  deductPoints,
  getCustomersPointsSummary,
} = require("../controllers/adminPointsController");

// Check admin permissions middleware
const checkPointsPermission = (req, res, next) => {
  if (!req.user || !req.user.permissions || !req.user.permissions.points) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to manage loyalty points",
    });
  }
  next();
};

// Apply protection and permission checks to all routes
router.use(protect, checkPointsPermission);

// Get all points history with filtering and pagination
router.get("/history", getPointsHistory);

// Get customer summary with points info
router.get("/customers", getCustomersPointsSummary);

// Add points to a customer
router.post("/add/:customerId", addPoints);

// Deduct points from a customer
router.post("/deduct/:customerId", deductPoints);

module.exports = router;
