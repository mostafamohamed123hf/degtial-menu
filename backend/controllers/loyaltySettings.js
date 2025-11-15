const GlobalSettings = require("../models/GlobalSettings");

// Get loyalty discount settings
exports.getLoyaltyDiscountSettings = async (req, res) => {
  try {
    // Try to get settings from database
    let settings = await GlobalSettings.findOne({
      key: "loyaltyDiscountSettings",
    });

    // If settings don't exist, create default settings
    if (!settings) {
      const defaultSettings = {
        discountPerPoint: 0.5, // 0.5% discount per point
        minPointsForDiscount: 10, // Minimum 10 points needed
        isEnabled: true, // Is custom discount enabled
        maxDiscountValue: 50, // Maximum 50% discount
      };

      settings = await GlobalSettings.create({
        key: "loyaltyDiscountSettings",
        value: defaultSettings,
      });
    }

    res.status(200).json({
      success: true,
      data: settings.value,
    });
  } catch (error) {
    console.error("Error fetching loyalty discount settings:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving loyalty discount settings",
      error: error.message,
    });
  }
};

// Update loyalty discount settings
exports.updateLoyaltyDiscountSettings = async (req, res) => {
  try {
    const {
      discountPerPoint,
      minPointsForDiscount,
      maxDiscountValue,
      isEnabled,
    } = req.body;

    // Validate inputs
    if (
      !discountPerPoint ||
      isNaN(parseFloat(discountPerPoint)) ||
      parseFloat(discountPerPoint) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid discount per point value is required",
      });
    }

    if (
      !minPointsForDiscount ||
      isNaN(parseInt(minPointsForDiscount)) ||
      parseInt(minPointsForDiscount) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid minimum points value is required",
      });
    }

    if (
      !maxDiscountValue ||
      isNaN(parseInt(maxDiscountValue)) ||
      parseInt(maxDiscountValue) < 1 ||
      parseInt(maxDiscountValue) > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid maximum discount value is required (1-100)",
      });
    }

    // Format the settings object
    const settings = {
      discountPerPoint: parseFloat(discountPerPoint),
      minPointsForDiscount: parseInt(minPointsForDiscount),
      maxDiscountValue: parseInt(maxDiscountValue),
      isEnabled: isEnabled === true || isEnabled === "true",
    };

    // Update or create settings in database
    const updatedSettings = await GlobalSettings.findOneAndUpdate(
      { key: "loyaltyDiscountSettings" },
      { value: settings },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Loyalty discount settings updated successfully",
      data: updatedSettings.value,
    });
  } catch (error) {
    console.error("Error updating loyalty discount settings:", error);
    res.status(500).json({
      success: false,
      message: "Error updating loyalty discount settings",
      error: error.message,
    });
  }
};

// Get loyalty points settings
exports.getLoyaltyPointsSettings = async (req, res) => {
  try {
    // Try to get settings from database
    let settings = await GlobalSettings.findOne({
      key: "loyaltyPointsSettings",
    });

    // If settings don't exist, create default settings
    if (!settings) {
      const defaultSettings = {
        exchangeRate: 10, // 10 points per L.E
        expiryDays: 365, // Points expire after 365 days
      };

      settings = await GlobalSettings.create({
        key: "loyaltyPointsSettings",
        value: defaultSettings,
      });
    }

    res.status(200).json({
      success: true,
      data: settings.value,
    });
  } catch (error) {
    console.error("Error fetching loyalty points settings:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving loyalty points settings",
      error: error.message,
    });
  }
};

// Update loyalty points settings
exports.updateLoyaltyPointsSettings = async (req, res) => {
  try {
    const { exchangeRate, expiryDays } = req.body;

    // Validate inputs
    if (
      !exchangeRate ||
      isNaN(parseInt(exchangeRate)) ||
      parseInt(exchangeRate) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid exchange rate is required",
      });
    }

    if (
      expiryDays === undefined ||
      isNaN(parseInt(expiryDays)) ||
      parseInt(expiryDays) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid expiry days value is required",
      });
    }

    // Format the settings object
    const settings = {
      exchangeRate: parseInt(exchangeRate),
      expiryDays: parseInt(expiryDays),
    };

    // Update or create settings in database
    const updatedSettings = await GlobalSettings.findOneAndUpdate(
      { key: "loyaltyPointsSettings" },
      { value: settings },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Loyalty points settings updated successfully",
      data: updatedSettings.value,
    });
  } catch (error) {
    console.error("Error updating loyalty points settings:", error);
    res.status(500).json({
      success: false,
      message: "Error updating loyalty points settings",
      error: error.message,
    });
  }
};

// Get free items settings
exports.getFreeItems = async (req, res) => {
  try {
    // Try to get settings from database
    let settings = await GlobalSettings.findOne({ key: "loyaltyFreeItems" });

    // If settings don't exist, create default empty array
    if (!settings) {
      settings = await GlobalSettings.create({
        key: "loyaltyFreeItems",
        value: [],
      });
    }

    res.status(200).json({
      success: true,
      data: settings.value,
    });
  } catch (error) {
    console.error("Error fetching loyalty free items:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving loyalty free items",
      error: error.message,
    });
  }
};

// Update free items settings
exports.updateFreeItems = async (req, res) => {
  try {
    const freeItems = req.body;

    // Validate that freeItems is an array
    if (!Array.isArray(freeItems)) {
      return res.status(400).json({
        success: false,
        message: "Free items must be an array",
      });
    }

    // Update or create settings in database
    const updatedSettings = await GlobalSettings.findOneAndUpdate(
      { key: "loyaltyFreeItems" },
      { value: freeItems },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Loyalty free items updated successfully",
      data: updatedSettings.value,
    });
  } catch (error) {
    console.error("Error updating loyalty free items:", error);
    res.status(500).json({
      success: false,
      message: "Error updating loyalty free items",
      error: error.message,
    });
  }
};
