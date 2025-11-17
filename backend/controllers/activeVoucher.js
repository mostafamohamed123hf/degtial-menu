<<<<<<< HEAD
const mongoose = require("mongoose");
const asyncHandler = require("../middleware/async");
const ErrorResponse = require("../utils/errorResponse");

// Define a schema for active voucher
const ActiveVoucherSchema = new mongoose.Schema({
  voucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Voucher",
  },
  code: {
    type: String,
    required: true,
  },
  discount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ["percentage", "fixed"],
    required: true,
  },
  value: {
    type: Number,
    required: true,
  },
  maxDiscount: {
    type: Number,
    default: null,
  },
  discountAmount: {
    type: Number,
    required: true,
  },
  originalValue: {
    type: Number,
    required: true,
  },
  finalValue: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create the model if it doesn't exist
const ActiveVoucher =
  mongoose.models.ActiveVoucher ||
  mongoose.model("ActiveVoucher", ActiveVoucherSchema);

// @desc    Get active voucher
// @route   GET /api/vouchers/active
// @access  Public
exports.getActiveVoucher = asyncHandler(async (req, res, next) => {
  const activeVoucher = await ActiveVoucher.findOne().sort({ createdAt: -1 });

  if (!activeVoucher) {
    return res.status(404).json({
      success: false,
      message: "No active voucher found",
    });
  }

  res.status(200).json({
    success: true,
    data: activeVoucher,
  });
});

// @desc    Set active voucher
// @route   POST /api/vouchers/active
// @access  Public
exports.setActiveVoucher = asyncHandler(async (req, res, next) => {
  // Clear any existing active vouchers
  await ActiveVoucher.deleteMany({});

  // Create new active voucher
  const activeVoucher = await ActiveVoucher.create(req.body);

  // Notify connected clients about the voucher update
  if (global.notifyClients) {
    global.notifyClients("active-voucher-updated", activeVoucher);
  }

  res.status(201).json({
    success: true,
    data: activeVoucher,
  });
});

// @desc    Remove active voucher
// @route   DELETE /api/vouchers/active
// @access  Public
exports.removeActiveVoucher = asyncHandler(async (req, res, next) => {
  await ActiveVoucher.deleteMany({});

  // Notify connected clients about the voucher removal
  if (global.notifyClients) {
    global.notifyClients("active-voucher-removed", {});
  }

  res.status(200).json({
    success: true,
    data: {},
  });
});
=======
const mongoose = require("mongoose");
const asyncHandler = require("../middleware/async");
const ErrorResponse = require("../utils/errorResponse");

// Define a schema for active voucher
const ActiveVoucherSchema = new mongoose.Schema({
  voucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Voucher",
  },
  code: {
    type: String,
    required: true,
  },
  discount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ["percentage", "fixed"],
    required: true,
  },
  value: {
    type: Number,
    required: true,
  },
  maxDiscount: {
    type: Number,
    default: null,
  },
  discountAmount: {
    type: Number,
    required: true,
  },
  originalValue: {
    type: Number,
    required: true,
  },
  finalValue: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create the model if it doesn't exist
const ActiveVoucher =
  mongoose.models.ActiveVoucher ||
  mongoose.model("ActiveVoucher", ActiveVoucherSchema);

// @desc    Get active voucher
// @route   GET /api/vouchers/active
// @access  Public
exports.getActiveVoucher = asyncHandler(async (req, res, next) => {
  const activeVoucher = await ActiveVoucher.findOne().sort({ createdAt: -1 });

  if (!activeVoucher) {
    return res.status(404).json({
      success: false,
      message: "No active voucher found",
    });
  }

  res.status(200).json({
    success: true,
    data: activeVoucher,
  });
});

// @desc    Set active voucher
// @route   POST /api/vouchers/active
// @access  Public
exports.setActiveVoucher = asyncHandler(async (req, res, next) => {
  // Clear any existing active vouchers
  await ActiveVoucher.deleteMany({});

  // Create new active voucher
  const activeVoucher = await ActiveVoucher.create(req.body);

  // Notify connected clients about the voucher update
  if (global.notifyClients) {
    global.notifyClients("active-voucher-updated", activeVoucher);
  }

  res.status(201).json({
    success: true,
    data: activeVoucher,
  });
});

// @desc    Remove active voucher
// @route   DELETE /api/vouchers/active
// @access  Public
exports.removeActiveVoucher = asyncHandler(async (req, res, next) => {
  await ActiveVoucher.deleteMany({});

  // Notify connected clients about the voucher removal
  if (global.notifyClients) {
    global.notifyClients("active-voucher-removed", {});
  }

  res.status(200).json({
    success: true,
    data: {},
  });
});
>>>>>>> e17e82634e94e59ba130b332d7929f60eb408654
