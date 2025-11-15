const Customer = require("../models/Customer");
const PointsHistory = require("../models/PointsHistory");

// Get points history for all customers or a specific customer
exports.getPointsHistory = async (req, res) => {
  try {
    const {
      customerId,
      page = 1,
      limit = 20,
      source,
      sortBy = "date",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};
    if (customerId) {
      query.customer = customerId;
    }

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

    // Execute query with pagination and sorting
    const history = await PointsHistory.find(query)
      .populate("customer", "name username email phone")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: history.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      data: history,
    });
  } catch (error) {
    console.error("Error fetching points history:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving points history",
      error: error.message,
    });
  }
};

// Add points to a customer (admin operation)
exports.addPoints = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { points, description } = req.body;

    // Validate input
    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    if (!points || isNaN(parseInt(points)) || parseInt(points) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid points value is required (must be a positive number)",
      });
    }

    const pointsToAdd = parseInt(points);

    // Find customer
    const customer = await Customer.findById(customerId);
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
      description: description || "Points added by admin",
      source: "manual",
    });

    // Save both updates
    await Promise.all([customer.save(), historyEntry.save()]);

    res.status(200).json({
      success: true,
      message: "Loyalty points added successfully",
      data: {
        pointsAdded: pointsToAdd,
        currentPoints: customer.loyaltyPoints,
        customerId: customer._id,
        customerName: customer.name,
      },
    });
  } catch (error) {
    console.error("Error adding points to customer:", error);
    res.status(500).json({
      success: false,
      message: "Error adding points to customer",
      error: error.message,
    });
  }
};

// Deduct points from a customer (admin operation)
exports.deductPoints = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { points, description } = req.body;

    // Validate input
    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    if (!points || isNaN(parseInt(points)) || parseInt(points) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid points value is required (must be a positive number)",
      });
    }

    const pointsToDeduct = parseInt(points);

    // Find customer
    const customer = await Customer.findById(customerId);
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
        message: "Customer does not have enough points",
      });
    }

    // Deduct points from customer
    customer.loyaltyPoints -= pointsToDeduct;

    // Create history entry
    const historyEntry = new PointsHistory({
      customer: customer._id,
      points: -pointsToDeduct, // Negative value to indicate deduction
      description: description || "Points deducted by admin",
      source: "manual",
    });

    // Save both updates
    await Promise.all([customer.save(), historyEntry.save()]);

    res.status(200).json({
      success: true,
      message: "Loyalty points deducted successfully",
      data: {
        pointsDeducted: pointsToDeduct,
        currentPoints: customer.loyaltyPoints,
        customerId: customer._id,
        customerName: customer.name,
      },
    });
  } catch (error) {
    console.error("Error deducting points from customer:", error);
    res.status(500).json({
      success: false,
      message: "Error deducting points from customer",
      error: error.message,
    });
  }
};

// Get customer summary with points info
exports.getCustomersPointsSummary = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;

    // Build search query
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count for pagination
    const total = await Customer.countDocuments(query);

    // Execute query with pagination
    const customers = await Customer.find(
      query,
      "name username email phone loyaltyPoints"
    )
      .sort({ loyaltyPoints: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // For each customer, get their latest points history entry
    const customersWithLatestActivity = await Promise.all(
      customers.map(async (customer) => {
        const latestActivity = await PointsHistory.findOne({
          customer: customer._id,
        })
          .sort({ date: -1 })
          .select("date points description source");

        return {
          _id: customer._id,
          name: customer.name,
          username: customer.username,
          email: customer.email,
          phone: customer.phone,
          loyaltyPoints: customer.loyaltyPoints || 0,
          latestActivity: latestActivity || null,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: customersWithLatestActivity.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      data: customersWithLatestActivity,
    });
  } catch (error) {
    console.error("Error fetching customers points summary:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving customers points summary",
      error: error.message,
    });
  }
};

module.exports = exports;
