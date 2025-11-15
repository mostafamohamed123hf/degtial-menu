const express = require("express");
const router = express.Router();
const {
  getOffers,
  getOffer,
  createOffer,
  updateOffer,
  deleteOffer,
  getFeaturedOffer,
  getEligibleOffers,
  claimOffer,
} = require("../controllers/offerController");
const { protect } = require("../middleware/auth");
const { optionalProtectCustomer } = require("../middleware/customerAuth");

// Public routes
router.get("/", getOffers);
router.get("/featured", getFeaturedOffer);
router.get("/eligible", optionalProtectCustomer, getEligibleOffers);
router.get("/:id", getOffer);

// Customer routes (require customer authentication)
router.post("/:id/claim", optionalProtectCustomer, claimOffer);

// Protected routes (require admin authentication)
router.post("/", protect, createOffer);
router.put("/:id", protect, updateOffer);
router.delete("/:id", protect, deleteOffer);

module.exports = router;
