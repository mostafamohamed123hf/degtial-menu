const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  titleEn: {
    type: String,
    trim: true,
    default: "",
  },
  description: {
    type: String,
    required: true,
  },
  descriptionEn: {
    type: String,
    default: "",
  },
  originalPrice: {
    type: Number,
    required: true,
  },
  discountedPrice: {
    type: Number,
    required: true,
  },
  discountPercentage: {
    type: Number,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ["all", "new", "weekly", "special"],
    default: "all",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    default: null,
  },
  userLimit: {
    type: Number,
    default: null,
    min: 0,
  },
  claimedBy: [
    {
      customerId: {
        type: String,
        required: true,
      },
      claimedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  minPurchase: {
    type: Number,
    default: null,
    min: 0,
  },
  customerEligibility: {
    type: String,
    enum: ["all", "new", "existing", "loyalty"],
    default: "all",
  },
  minLoyaltyPoints: {
    type: Number,
    default: null,
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp before saving
OfferSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Offer", OfferSchema);
