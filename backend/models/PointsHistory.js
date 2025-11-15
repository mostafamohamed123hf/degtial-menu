const mongoose = require("mongoose");

const PointsHistorySchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  points: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    enum: ["order", "registration", "manual", "redeem", "refund", "free_item", "other"],
    default: "other",
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: false,
  },
  orderNumber: {
    type: String,
    required: false,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("PointsHistory", PointsHistorySchema);
