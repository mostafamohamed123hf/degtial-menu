<<<<<<< HEAD
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const VoucherSchema = new Schema(
  {
    code: {
      type: String,
      required: [true, "Voucher code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      required: [true, "Voucher type is required"],
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    value: {
      type: Number,
      required: [true, "Voucher value is required"],
      min: [0, "Voucher value cannot be negative"],
    },
    maxDiscount: {
      type: Number,
      default: null,
    },
    minOrderValue: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: function () {
        // Default to 30 days from creation if not specified
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date;
      },
    },
    maxUses: {
      type: Number,
      default: null,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    applicableCategories: [
      {
        type: String,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Check if voucher is valid and can be used
VoucherSchema.methods.isValid = function (orderValue) {
  const now = new Date();

  // Check if voucher is active
  if (!this.isActive) return false;

  // Check if voucher is expired
  if (now > this.endDate || now < this.startDate) return false;

  // Check if voucher has reached max uses
  if (this.maxUses !== null && this.usedCount >= this.maxUses) return false;

  // Check if order meets minimum value requirement
  if (orderValue < this.minOrderValue) return false;

  return true;
};

// Calculate discount amount for an order
VoucherSchema.methods.calculateDiscount = function (orderValue) {
  if (!this.isValid(orderValue)) return 0;

  let discountAmount = 0;

  if (this.type === "percentage") {
    discountAmount = (orderValue * this.value) / 100;

    // Apply max discount cap if it exists
    if (this.maxDiscount !== null && discountAmount > this.maxDiscount) {
      discountAmount = this.maxDiscount;
    }
  } else {
    // Fixed amount discount
    discountAmount = this.value;

    // Discount cannot be more than order value
    if (discountAmount > orderValue) {
      discountAmount = orderValue;
    }
  }

  return discountAmount;
};

module.exports = mongoose.model("Voucher", VoucherSchema);
=======
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const VoucherSchema = new Schema(
  {
    code: {
      type: String,
      required: [true, "Voucher code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      required: [true, "Voucher type is required"],
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    value: {
      type: Number,
      required: [true, "Voucher value is required"],
      min: [0, "Voucher value cannot be negative"],
    },
    maxDiscount: {
      type: Number,
      default: null,
    },
    minOrderValue: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: function () {
        // Default to 30 days from creation if not specified
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date;
      },
    },
    maxUses: {
      type: Number,
      default: null,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    applicableCategories: [
      {
        type: String,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Check if voucher is valid and can be used
VoucherSchema.methods.isValid = function (orderValue) {
  const now = new Date();

  // Check if voucher is active
  if (!this.isActive) return false;

  // Check if voucher is expired
  if (now > this.endDate || now < this.startDate) return false;

  // Check if voucher has reached max uses
  if (this.maxUses !== null && this.usedCount >= this.maxUses) return false;

  // Check if order meets minimum value requirement
  if (orderValue < this.minOrderValue) return false;

  return true;
};

// Calculate discount amount for an order
VoucherSchema.methods.calculateDiscount = function (orderValue) {
  if (!this.isValid(orderValue)) return 0;

  let discountAmount = 0;

  if (this.type === "percentage") {
    discountAmount = (orderValue * this.value) / 100;

    // Apply max discount cap if it exists
    if (this.maxDiscount !== null && discountAmount > this.maxDiscount) {
      discountAmount = this.maxDiscount;
    }
  } else {
    // Fixed amount discount
    discountAmount = this.value;

    // Discount cannot be more than order value
    if (discountAmount > orderValue) {
      discountAmount = orderValue;
    }
  }

  return discountAmount;
};

module.exports = mongoose.model("Voucher", VoucherSchema);
>>>>>>> e17e82634e94e59ba130b332d7929f60eb408654
