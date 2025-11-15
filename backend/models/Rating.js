const mongoose = require("mongoose");

const RatingSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      ref: "Product",
    },
    orderId: {
      type: String,
      required: true,
      ref: "Order",
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false, // Allow anonymous ratings
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Add a compound unique index to prevent duplicate ratings for the same product-order combination
RatingSchema.index({ productId: 1, orderId: 1 }, { unique: true });

// No unique index constraint - allow multiple ratings for the same product-order combination
// This will be controlled at the application level by checking order.isRated

module.exports = mongoose.model("Rating", RatingSchema);
