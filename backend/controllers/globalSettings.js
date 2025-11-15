const GlobalSettings = require("../models/GlobalSettings");
const asyncHandler = require("../middleware/async");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all global settings
// @route   GET /api/global-settings
// @access  Public
exports.getGlobalSettings = asyncHandler(async (req, res, next) => {
  const settings = await GlobalSettings.find();
  
  // Convert array to object for easier access
  const settingsObj = {};
  settings.forEach(setting => {
    settingsObj[setting.key] = setting.value;
  });

  res.status(200).json({
    success: true,
    data: settingsObj,
  });
});

// @desc    Get a specific global setting by key
// @route   GET /api/global-settings/:key
// @access  Public
exports.getGlobalSetting = asyncHandler(async (req, res, next) => {
  const setting = await GlobalSettings.findOne({ key: req.params.key });

  if (!setting) {
    return next(
      new ErrorResponse(`Setting with key ${req.params.key} not found`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: setting,
  });
});

// @desc    Update or create global settings
// @route   PUT /api/global-settings
// @access  Admin
exports.updateGlobalSettings = asyncHandler(async (req, res, next) => {
  const settingsData = req.body;

  // Validate that we have settings data
  if (!settingsData || Object.keys(settingsData).length === 0) {
    return next(new ErrorResponse("Please provide settings to update", 400));
  }

  const updatedSettings = [];

  // Update or create each setting
  for (const [key, value] of Object.entries(settingsData)) {
    const setting = await GlobalSettings.findOneAndUpdate(
      { key },
      { key, value, updatedAt: Date.now() },
      { new: true, upsert: true, runValidators: true }
    );
    updatedSettings.push(setting);
  }

  // Convert array to object for response
  const settingsObj = {};
  updatedSettings.forEach(setting => {
    settingsObj[setting.key] = setting.value;
  });

  // Notify connected clients about the settings update
  if (global.notifyClients) {
    global.notifyClients("global-settings-updated", settingsObj);
  }

  res.status(200).json({
    success: true,
    data: settingsObj,
  });
});

// @desc    Delete a global setting
// @route   DELETE /api/global-settings/:key
// @access  Admin
exports.deleteGlobalSetting = asyncHandler(async (req, res, next) => {
  const setting = await GlobalSettings.findOneAndDelete({ key: req.params.key });

  if (!setting) {
    return next(
      new ErrorResponse(`Setting with key ${req.params.key} not found`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Initialize default global settings
// @route   POST /api/global-settings/initialize
// @access  Admin
exports.initializeDefaultSettings = asyncHandler(async (req, res, next) => {
  const defaultSettings = [
    { key: "workingHoursStart", value: "09:00" },
    { key: "workingHoursEnd", value: "23:00" },
    { key: "workingDays", value: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] },
    { key: "contactPhone", value: "" },
    { key: "contactWhatsapp", value: "" },
    { key: "contactEmail", value: "" },
    { key: "currency", value: "EGP" },
    { key: "currencySymbol", value: "جنيه" },
    { key: "restaurantName", value: "Digital Menu" },
    { key: "restaurantNameEn", value: "Digital Menu" },
    { key: "restaurantAddress", value: "" },
    { key: "restaurantAddressEn", value: "" },
    { key: "heroBannerEnabled", value: true },
    { key: "heroBannerTitle", value: "Delicious Burger" },
    { key: "heroBannerTitleEn", value: "Delicious Burger" },
    { key: "heroBannerDescription", value: "مكونات طازجة، طعم رائع" },
    { key: "heroBannerDescriptionEn", value: "Fresh ingredients, amazing taste" },
    { key: "heroBannerOriginalPrice", value: 75 },
    { key: "heroBannerDiscountedPrice", value: 55 },
    { key: "heroBannerCategory", value: "burger" },
    { key: "heroBannerImage", value: "" },
  ];

  const createdSettings = [];

  for (const setting of defaultSettings) {
    // Only create if doesn't exist
    const existingSetting = await GlobalSettings.findOne({ key: setting.key });
    if (!existingSetting) {
      const newSetting = await GlobalSettings.create(setting);
      createdSettings.push(newSetting);
    }
  }

  res.status(200).json({
    success: true,
    message: `Initialized ${createdSettings.length} default settings`,
    data: createdSettings,
  });
});
