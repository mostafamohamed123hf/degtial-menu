<<<<<<< HEAD
const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const {
  getTaxSettings,
  updateTaxSettings,
} = require("../controllers/taxSettings");

// Import middleware
const { protect, authorize } = require("../middleware/auth");

// Public route to get tax settings
router.get("/", getTaxSettings);

// Admin only route to update tax settings
router.put(
  "/",
  protect,
  authorize("admin"),
  [
    check("rate", "Rate must be a number").isNumeric(),
    check("serviceRate", "Service rate must be a number").isNumeric(),
  ],
  updateTaxSettings
);

module.exports = router;
=======
const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const {
  getTaxSettings,
  updateTaxSettings,
} = require("../controllers/taxSettings");

// Import middleware
const { protect, authorize } = require("../middleware/auth");

// Public route to get tax settings
router.get("/", getTaxSettings);

// Admin only route to update tax settings
router.put(
  "/",
  protect,
  authorize("admin"),
  [
    check("rate", "Rate must be a number").isNumeric(),
    check("serviceRate", "Service rate must be a number").isNumeric(),
  ],
  updateTaxSettings
);

module.exports = router;
>>>>>>> e17e82634e94e59ba130b332d7929f60eb408654
