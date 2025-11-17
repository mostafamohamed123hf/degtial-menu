const express = require("express");
const { check } = require("express-validator");
const router = express.Router();
const {
  register,
  login,
  getMe,
  logout,
  updateProfile,
  forgotPassword,
  refreshToken,
  toggleAdminAccess,
} = require("../controllers/customerAuth");
const {
  getCustomers,
  getCustomer,
  updatePermissions,
  suspendCustomer,
  activateCustomer,
  deleteCustomer,
} = require("../controllers/customer");
const {
  getLoyaltyDiscountSettings,
  updateLoyaltyDiscountSettings,
  getLoyaltyPointsSettings,
  updateLoyaltyPointsSettings,
  getFreeItems,
  updateFreeItems,
} = require("../controllers/loyaltySettings");
const { protectCustomer } = require("../middleware/customerAuth");
const { protect, authorize } = require("../middleware/auth");
const Customer = require("../models/Customer");
const GlobalSettings = require("../models/GlobalSettings");
const PointsHistory = require("../models/PointsHistory");

// Register customer
router.post(
  "/register",
  [
    check("name", "Name is required").not().isEmpty(),
    check("username", "Username is required")
      .not()
      .isEmpty()
      .isLength({ min: 3, max: 30 })
      .withMessage("Username must be between 3 and 30 characters")
      .matches(/^[a-zA-Z0-9_\-.]+$/)
      .withMessage(
        "Username can only contain letters, numbers, and the characters _ - ."
      ),
    check("email", "Please include a valid email").isEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({ min: 6 }),
    check("termsAccepted", "You must accept the terms and conditions").equals(
      "true"
    ),
  ],
  register
);

// Login customer
router.post(
  "/login",
  [
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password is required").exists(),
  ],
  login
);

// Get current logged in customer
router.get("/me", protectCustomer, getMe);

// Refresh token
router.post("/refresh-token", protectCustomer, refreshToken);

// Update customer profile
router.put("/profile", protectCustomer, updateProfile);

// Get customer loyalty points history
router.get("/loyalty-points/history", protectCustomer, async (req, res) => {
  try {
    const customerId = req.customer._id;
    const {
      page = 1,
      limit = 20,
      source,
      sortBy = "date",
      sortOrder = "desc",
    } = req.query;

    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Build query
    const query = { customer: customerId };

    if (source) {
      query.source = source;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Determine sort order
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Get total count for pagination
    const total = await PointsHistory.countDocuments(query);

    // Get history from PointsHistory collection with pagination and sorting
    let history = await PointsHistory.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("orderId", "orderNumber");

    // If no history entries exist yet, create an initial entry for registration points
    if (history.length === 0 && parseInt(page) === 1) {
      // Create a registration points entry
      const registrationEntry = new PointsHistory({
        customer: customerId,
        points: 50,
        description: "نقاط الترحيب عند التسجيل",
        source: "registration",
      });

      await registrationEntry.save();

      // Also add the points to the customer if they don't have any
      if (!customer.loyaltyPoints) {
        customer.loyaltyPoints = 50;
        await customer.save();
      }

      history = await PointsHistory.find({ customer: customerId }).sort({
        date: -1,
      });
    }

    // Format the history data
    const formattedHistory = history.map((entry) => ({
      id: entry._id,
      date: entry.date,
      points: entry.points,
      description: entry.description,
      source: entry.source,
      orderId: entry.orderId ? entry.orderId._id : null,
      orderNumber: entry.orderId ? entry.orderId.orderNumber : null,
    }));

    res.status(200).json({
      success: true,
      count: formattedHistory.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      data: formattedHistory,
      currentPoints: customer.loyaltyPoints || 0,
    });
  } catch (error) {
    console.error("Error fetching loyalty points history:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving loyalty points history",
      error: error.message,
    });
  }
});

// Upload profile photo
router.post("/upload-photo", protectCustomer, async (req, res) => {
  try {
    const { photo } = req.body;

    if (!photo) {
      return res.status(400).json({
        success: false,
        message: "No photo data provided",
      });
    }

    // Get customer
    const customer = await Customer.findById(req.customer.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // In a production app, you would:
    // 1. Validate the photo data (check if it's a valid image)
    // 2. Potentially resize/compress the image
    // 3. Upload to a storage service like S3
    // 4. Store the URL to the image

    // For now, we'll just store the image data directly
    // Note: In production, you should NOT store large base64 images directly in the DB
    customer.profilePhoto = photo;
    await customer.save();

    res.status(200).json({
      success: true,
      photoUrl: photo,
      message: "تم تحديث الصورة بنجاح",
    });
  } catch (err) {
    console.error("Error uploading photo:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

// Change password
router.post("/change-password", protectCustomer, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide current and new password",
      });
    }

    // Check minimum password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Get customer with password
    const customer = await Customer.findById(req.customer.id).select(
      "+password"
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Check if current password matches
    const isMatch = await customer.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(200).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    customer.password = newPassword;
    await customer.save();

    res.status(200).json({
      success: true,
      message: "تم تغيير كلمة المرور بنجاح",
    });
  } catch (err) {
    console.error("Error changing password:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

// Logout customer
router.get("/logout", protectCustomer, logout);

// Forgot password
router.post("/forgot-password", forgotPassword);

// ADMIN ROUTES FOR CUSTOMER ACCOUNT MANAGEMENT
// Protect and restrict to admin
router.use("/accounts", protect, authorize("admin"));

// Get all customers with pagination
router.get("/accounts", getCustomers);

// Get single customer
router.get("/accounts/:id", getCustomer);

// Update customer permissions
router.put("/accounts/:id/permissions", updatePermissions);

// Suspend customer account
router.put("/accounts/:id/suspend", suspendCustomer);

// Activate customer account
router.put("/accounts/:id/activate", activateCustomer);

// Delete customer account
router.delete("/accounts/:id", deleteCustomer);

// Reset loyalty points for all customers
router.put(
  "/loyalty/reset-all",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      // First find all customers with points > 0
      const customersWithPoints = await Customer.find({
        loyaltyPoints: { $gt: 0 },
      });

      // Create points history entries for each customer who had points
      const historyEntries = customersWithPoints.map((customer) => ({
        customer: customer._id,
        points: -customer.loyaltyPoints, // Negative value to indicate deduction
        description: "إعادة تعيين النقاط من الإدارة (تصفير عام)",
        source: "manual",
      }));

      // Insert history entries in bulk if there are any
      if (historyEntries.length > 0) {
        await PointsHistory.insertMany(historyEntries);
      }

      // Update all customers and set loyaltyPoints to 0
      const result = await Customer.updateMany(
        {}, // match all documents
        { $set: { loyaltyPoints: 0 } }
      );

      res.status(200).json({
        success: true,
        message: "Loyalty points reset for all customers",
        count: result.modifiedCount,
        historyEntriesCreated: historyEntries.length,
      });
    } catch (error) {
      console.error("Error resetting all loyalty points:", error);
      res.status(500).json({
        success: false,
        message: "Error resetting loyalty points",
        error: error.message,
      });
    }
  }
);

// Reset loyalty points for a specific customer
router.put(
  "/loyalty/reset/:id",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const customer = await Customer.findById(req.params.id);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      // Store current points before reset
      const currentPoints = customer.loyaltyPoints || 0;

      // Reset loyalty points to 0
      customer.loyaltyPoints = 0;

      // Only add history entry if customer had points
      if (currentPoints > 0) {
        // Create history entry for points reset
        const historyEntry = new PointsHistory({
          customer: customer._id,
          points: -currentPoints, // Negative value to indicate deduction
          description: "إعادة تعيين النقاط من الإدارة",
          source: "manual",
        });

        // Save both customer and history entry
        await Promise.all([customer.save(), historyEntry.save()]);
      } else {
        await customer.save();
      }

      res.status(200).json({
        success: true,
        message: "Loyalty points reset for customer",
        data: {
          customerId: customer._id,
          loyaltyPoints: 0,
        },
      });
    } catch (error) {
      console.error("Error resetting customer loyalty points:", error);
      res.status(500).json({
        success: false,
        message: "Error resetting loyalty points",
        error: error.message,
      });
    }
  }
);

// Adjust loyalty points for a customer
router.put(
  "/loyalty/adjust/:id",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const { points, description } = req.body;

      // Validate points input
      if (!points || isNaN(parseInt(points))) {
        return res.status(400).json({
          success: false,
          message: "Valid points value is required",
        });
      }

      const pointsToAdjust = parseInt(points);

      const customer = await Customer.findById(req.params.id);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      // Add points to current value (can be negative for deduction)
      const currentPoints = customer.loyaltyPoints || 0;
      const newPoints = Math.max(0, currentPoints + pointsToAdjust); // Prevent negative points

      customer.loyaltyPoints = newPoints;

      // Create history entry for points adjustment
      const historyEntry = new PointsHistory({
        customer: customer._id,
        points: pointsToAdjust,
        description:
          description ||
          (pointsToAdjust > 0
            ? "تعديل نقاط من الإدارة (إضافة)"
            : "تعديل نقاط من الإدارة (خصم)"),
        source: "manual",
      });

      // Save both customer and history entry
      await Promise.all([customer.save(), historyEntry.save()]);

      // Determine action for response message
      const action = pointsToAdjust > 0 ? "added to" : "deducted from";

      res.status(200).json({
        success: true,
        message: `${Math.abs(pointsToAdjust)} points ${action} customer`,
        data: {
          customerId: customer._id,
          previousPoints: currentPoints,
          pointsAdjusted: pointsToAdjust,
          newPoints: newPoints,
        },
      });
    } catch (error) {
      console.error("Error adjusting customer loyalty points:", error);
      res.status(500).json({
        success: false,
        message: "Error adjusting loyalty points",
        error: error.message,
      });
    }
  }
);

// Get customer loyalty points
router.get("/loyalty-points", protectCustomer, async (req, res) => {
  try {
    if (!req.customer || !req.customer._id) {
      return res.status(200).json({
        success: false,
        message: "You must be logged in to view loyalty points",
      });
    }

    const customer = await Customer.findById(req.customer._id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        loyaltyPoints: customer.loyaltyPoints || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching loyalty points:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving loyalty points",
      error: error.message,
    });
  }
});

// Get loyalty discount settings
router.get("/loyalty/discount-settings", async (req, res) => {
  try {
    // Try to get settings from database
    let settings = await GlobalSettings.findOne({
      key: "loyaltyDiscountSettings",
    });

    // If settings don't exist, use default settings
    if (!settings) {
      const defaultSettings = {
        discountPerPoint: 0.5, // 0.5% discount per point
        minPointsForDiscount: 10, // Minimum 10 points needed
        isEnabled: true, // Is custom discount enabled
        maxDiscountValue: 50, // Maximum 50% discount
      };

      return res.status(200).json({
        success: true,
        data: defaultSettings,
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
});

// Deduct loyalty points
router.post("/loyalty-points/deduct", protectCustomer, async (req, res) => {
  try {
    const { points, reason } = req.body;

    // Validate input
    if (!points || isNaN(parseInt(points)) || parseInt(points) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid points value is required",
      });
    }

    const pointsToDeduct = parseInt(points);

    // Find customer
    const customer = await Customer.findById(req.customer._id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Check if customer has enough points
    if (!customer.loyaltyPoints || customer.loyaltyPoints < pointsToDeduct) {
      return res.status(400).json({
        success: false,
        message: "Not enough loyalty points",
      });
    }

    // Deduct points
    customer.loyaltyPoints -= pointsToDeduct;

    // Create history entry with negative points value
    const historyEntry = new PointsHistory({
      customer: customer._id,
      points: -pointsToDeduct, // Negative value to indicate deduction
      description: reason || "استخدام نقاط",
      source: "redeem",
    });

    // Save both updates
    await Promise.all([customer.save(), historyEntry.save()]);

    res.status(200).json({
      success: true,
      message: "Loyalty points deducted successfully",
      data: {
        pointsDeducted: pointsToDeduct,
        currentPoints: customer.loyaltyPoints,
      },
    });
  } catch (error) {
    console.error("Error deducting loyalty points:", error);
    res.status(500).json({
      success: false,
      message: "Error deducting loyalty points",
      error: error.message,
    });
  }
});

// Add loyalty points
router.post("/loyalty-points/add", protectCustomer, async (req, res) => {
  try {
    const { points, description, source, orderId } = req.body;

    // Validate input
    if (!points || isNaN(parseInt(points)) || parseInt(points) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid points value is required",
      });
    }

    const pointsToAdd = parseInt(points);
    const pointsDescription = description || "نقاط مكتسبة";
    const pointsSource = source || "other";

    // Find customer
    const customer = await Customer.findById(req.customer.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Initialize loyalty points if undefined
    if (typeof customer.loyaltyPoints === "undefined") {
      customer.loyaltyPoints = 0;
    }

    // Add points to customer
    customer.loyaltyPoints += pointsToAdd;

    // Create history entry
    const historyEntry = new PointsHistory({
      customer: customer._id,
      points: pointsToAdd,
      description: pointsDescription,
      source: pointsSource,
      orderId: orderId || null,
    });

    // Save both updates
    await Promise.all([customer.save(), historyEntry.save()]);

    res.status(200).json({
      success: true,
      message: "Loyalty points added successfully",
      data: {
        pointsAdded: pointsToAdd,
        currentPoints: customer.loyaltyPoints,
        description: pointsDescription,
      },
    });
  } catch (error) {
    console.error("Error adding loyalty points:", error);
    res.status(500).json({
      success: false,
      message: "Error adding loyalty points",
      error: error.message,
    });
  }
});

// Update loyalty discount settings
router.put(
  "/loyalty/discount-settings",
  protect,
  authorize("admin"),
  updateLoyaltyDiscountSettings
);

// Get loyalty points settings
router.get("/loyalty/points-settings", getLoyaltyPointsSettings);

// Update loyalty points settings
router.put(
  "/loyalty/points-settings",
  protect,
  authorize("admin"),
  updateLoyaltyPointsSettings
);

// Get free items
router.get("/loyalty/free-items", getFreeItems);

// Update free items
router.put("/loyalty/free-items", protect, authorize("admin"), updateFreeItems);

// Toggle admin access for a customer
router.put(
  "/accounts/:id/admin-access",
  protect,
  authorize("admin"),
  toggleAdminAccess
);

// Add these new user role routes
// Get user role
router.get("/accounts/:id/role", protect, async (req, res) => {
  try {
    const customerId = req.params.id;

    // Find the customer and populate the role information
    const customer = await Customer.findById(customerId).populate({
      path: "roleId",
      select: "name permissions",
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Return role information, handling both referenced role and string role
    res.json({
      success: true,
      data: {
        roleId: customer.roleId ? customer.roleId._id : customer.roleIdString,
        roleName: customer.roleName,
        role: customer.roleId
          ? {
              id: customer.roleId._id,
              name: customer.roleId.name,
              permissions: customer.roleId.permissions,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("Error getting user role:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Update user role
router.put("/accounts/:id/role", protect, async (req, res) => {
  try {
    const customerId = req.params.id;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({
        success: false,
        message: "Role ID is required",
      });
    }

    const updateData = {};

    // Check if roleId is a valid ObjectId or the special "role_user" value
    if (roleId === "role_user") {
      // Special case for default user role
      updateData.roleIdString = "role_user";
      updateData.roleId = null;
      updateData.roleName = "مستخدم";
    } else {
      // For all other roles, attempt to find the role
      try {
        const Role = require("../models/Role");
        const role = await Role.findById(roleId);

        if (role) {
          updateData.roleId = roleId;
          updateData.roleIdString = roleId;
          updateData.roleName = role.name;
        } else {
          return res.status(404).json({
            success: false,
            message: "Role not found",
          });
        }
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid role ID format",
        });
      }
    }

    // Find and update the customer
    const customer = await Customer.findByIdAndUpdate(customerId, updateData, {
      new: true,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      message: "User role updated successfully",
      data: {
        roleId: customer.roleId || customer.roleIdString,
        roleName: customer.roleName,
      },
    });
  } catch (err) {
    console.error("Error updating user role:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
