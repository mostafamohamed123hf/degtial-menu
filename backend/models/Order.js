const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false, // Not required for guest orders
    },
    customerName: {
      type: String,
      required: false, // Optional for guest orders
    },
    customerEmail: {
      type: String,
      required: false, // Optional for guest orders
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    orderId: {
      type: String,
      unique: true,
      sparse: true, // This allows multiple null values (ignores null in uniqueness constraint)
    },
    items: [
      {
        id: String,
        name: String,
        nameEn: String, // English name for language switching
        nameAr: String, // Arabic name for language switching
        price: Number,
        quantity: Number,
        notes: String,
        addons: Array,
        addonsList: Array,
        image: String,
        isFreeItem: {
          type: Boolean,
          default: false,
        },
        pointsRequired: {
          type: Number,
          default: 0,
        },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
    },
    tax: {
      rate: Number,
      value: Number,
    },
    serviceTax: {
      rate: Number,
      value: Number,
    },
    discount: {
      code: String,
      value: Number,
    },
    loyaltyDiscount: {
      pointsUsed: Number,
      value: Number,
    },
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "cancelled"],
      default: "pending",
    },
    isRated: {
      type: Boolean,
      default: false,
    },
    ratingSkipped: {
      type: Boolean,
      default: false,
    },
    tableNumber: {
      type: String,
      default: "0",
    },
    date: {
      type: Date,
      default: Date.now,
    },
    loyaltyPointsUsed: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes to speed up common queries
OrderSchema.index({ date: -1 });
OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ orderId: 1 }, { sparse: true });

// Generate a random order number and set orderId if not provided
OrderSchema.pre("save", async function (next) {
  // Generate a random order number if not provided
  if (!this.orderNumber) {
    const randomNum = Math.floor(Math.random() * 900000) + 100000; // 6-digit number
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    this.orderNumber = `ORD-${dateStr}-${randomNum}`;
  }

  // If the orderNumber doesn't follow our format, update it
  if (!this.orderNumber.startsWith("ORD-")) {
    const randomNum = Math.floor(Math.random() * 900000) + 100000; // 6-digit number
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    this.orderNumber = `ORD-${dateStr}-${randomNum}`;
  }

  // Set orderId to match orderNumber if not provided
  // This ensures we have a value for the sparse index
  if (!this.orderId) {
    this.orderId = this.orderNumber;
  }

  next();
});

module.exports = mongoose.model("Order", OrderSchema);
