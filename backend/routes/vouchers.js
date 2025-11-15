const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const {
  getVouchers,
  getVoucher,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  validateVoucher,
  applyVoucher,
  getPublicVouchers,
} = require("../controllers/vouchers");

const {
  getActiveVoucher,
  setActiveVoucher,
  removeActiveVoucher,
} = require("../controllers/activeVoucher");

// Import middleware
const { protect, authorize } = require("../middleware/auth");
const { voucherLimiter } = require("../middleware/rateLimiter");

// Add debugging middleware for voucher routes
router.use((req, res, next) => {
  console.log(`Voucher API Request: [${req.method}] ${req.originalUrl}`);
  console.log("Request body:", req.body);

  // Store original send to intercept the response
  const originalSend = res.send;
  res.send = function (data) {
    console.log(
      "Voucher API Response:",
      typeof data === "string" ? data.substring(0, 100) : data
    );
    originalSend.apply(this, arguments);
  };

  next();
});

// Active voucher routes
router.get("/active", getActiveVoucher);
router.post("/active", protect, setActiveVoucher);
router.delete("/active", protect, removeActiveVoucher);

// Public routes
router.get("/public", getPublicVouchers);

// Public routes with rate limiting
router.post(
  "/validate",
  voucherLimiter, // Apply voucher-specific rate limiter
  [
    check("code", "Voucher code is required").not().isEmpty(),
    check("orderValue", "Order value must be a number").isNumeric(),
  ],
  validateVoucher
);

// Protected routes
router.post(
  "/apply",
  protect,
  [
    check("voucherId", "Voucher ID is required").not().isEmpty(),
    check("orderValue", "Order value must be a number").isNumeric(),
  ],
  applyVoucher
);

// Admin only routes
router
  .route("/")
  .get(protect, authorize("admin"), getVouchers)
  .post(
    protect,
    authorize("admin"),
    [
      check("code", "Voucher code is required").not().isEmpty(),
      check("type", "Type must be either percentage or fixed").isIn([
        "percentage",
        "fixed",
      ]),
      check("value", "Value is required and must be a number").isNumeric(),
    ],
    createVoucher
  );

router
  .route("/:id")
  .get(protect, authorize("admin"), getVoucher)
  .put(protect, authorize("admin"), updateVoucher)
  .delete(protect, authorize("admin"), deleteVoucher);

module.exports = router;
