const express = require("express");
const router = express.Router();
const {
  getGlobalSettings,
  getGlobalSetting,
  updateGlobalSettings,
  deleteGlobalSetting,
  initializeDefaultSettings,
} = require("../controllers/globalSettings");

// Import middleware
const { protect, authorize } = require("../middleware/auth");

// Public routes to get settings
router.get("/", getGlobalSettings);
router.get("/:key", getGlobalSetting);

// Admin only routes
router.put("/", protect, authorize("admin"), updateGlobalSettings);
router.delete("/:key", protect, authorize("admin"), deleteGlobalSetting);
router.post("/initialize", protect, authorize("admin"), initializeDefaultSettings);

module.exports = router;
