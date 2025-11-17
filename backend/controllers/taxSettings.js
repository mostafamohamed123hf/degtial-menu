<<<<<<< HEAD
const TaxSettings = require("../models/TaxSettings");
const asyncHandler = require("../middleware/async");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get tax settings
// @route   GET /api/tax-settings
// @access  Public
exports.getTaxSettings = asyncHandler(async (req, res, next) => {
  // There should only be one tax settings document
  let taxSettings = await TaxSettings.findOne();

  // If no tax settings exist, create default settings
  if (!taxSettings) {
    taxSettings = await TaxSettings.create({
      enabled: false,
      rate: 0,
      serviceEnabled: false,
      serviceRate: 0,
    });
  }

  res.status(200).json({
    success: true,
    data: taxSettings,
  });
});

// @desc    Update tax settings
// @route   PUT /api/tax-settings
// @access  Admin
exports.updateTaxSettings = asyncHandler(async (req, res, next) => {
  const { enabled, rate, serviceEnabled, serviceRate } = req.body;

  // Validate input
  if (rate < 0) {
    return next(new ErrorResponse("Tax rate cannot be negative", 400));
  }

  if (serviceRate < 0) {
    return next(new ErrorResponse("Service tax rate cannot be negative", 400));
  }

  // Find existing settings or create new ones
  let taxSettings = await TaxSettings.findOne();

  if (taxSettings) {
    taxSettings = await TaxSettings.findOneAndUpdate(
      {},
      {
        enabled,
        rate,
        serviceEnabled,
        serviceRate,
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true }
    );
  } else {
    taxSettings = await TaxSettings.create({
      enabled,
      rate,
      serviceEnabled,
      serviceRate,
    });
  }

  // Notify connected clients about the tax settings update
  if (global.notifyClients) {
    global.notifyClients("tax-settings-updated", taxSettings);
  }

  res.status(200).json({
    success: true,
    data: taxSettings,
  });
});
=======
const TaxSettings = require("../models/TaxSettings");
const mongoose = require("mongoose");
const asyncHandler = require("../middleware/async");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get tax settings
// @route   GET /api/tax-settings
// @access  Public
exports.getTaxSettings = asyncHandler(async (req, res, next) => {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return res.status(200).json({
      success: true,
      data: {
        enabled: false,
        rate: 0,
        serviceEnabled: false,
        serviceRate: 0,
      },
    });
  }

  let taxSettings = await TaxSettings.findOne();

  if (!taxSettings) {
    taxSettings = await TaxSettings.create({
      enabled: false,
      rate: 0,
      serviceEnabled: false,
      serviceRate: 0,
    });
  }

  res.status(200).json({
    success: true,
    data: taxSettings,
  });
});

// @desc    Update tax settings
// @route   PUT /api/tax-settings
// @access  Admin
exports.updateTaxSettings = asyncHandler(async (req, res, next) => {
  const { enabled, rate, serviceEnabled, serviceRate } = req.body;

  // Validate input
  if (rate < 0) {
    return next(new ErrorResponse("Tax rate cannot be negative", 400));
  }

  if (serviceRate < 0) {
    return next(new ErrorResponse("Service tax rate cannot be negative", 400));
  }

  // Find existing settings or create new ones
  let taxSettings = await TaxSettings.findOne();

  if (taxSettings) {
    taxSettings = await TaxSettings.findOneAndUpdate(
      {},
      {
        enabled,
        rate,
        serviceEnabled,
        serviceRate,
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true }
    );
  } else {
    taxSettings = await TaxSettings.create({
      enabled,
      rate,
      serviceEnabled,
      serviceRate,
    });
  }

  // Notify connected clients about the tax settings update
  if (global.notifyClients) {
    global.notifyClients("tax-settings-updated", taxSettings);
  }

  res.status(200).json({
    success: true,
    data: taxSettings,
  });
});
>>>>>>> e17e82634e94e59ba130b332d7929f60eb408654
