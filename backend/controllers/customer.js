const Customer = require("../models/Customer");

// @desc    Get all customers with pagination, filtering and searching
// @route   GET /api/customer/accounts
// @access  Private (Admin only)
exports.getCustomers = async (req, res) => {
  try {
    // Add pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Add filtering
    const filter = {};

    // Filter out test/fake accounts by checking common patterns
    // This is a simple approach - in a real app, you might want to use a 'test' flag in the database schema
    filter.email = { $not: { $regex: /(test|fake|demo|example)@/i } };

    // Add search
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
        { username: { $regex: req.query.search, $options: "i" } },
        { phone: { $regex: req.query.search, $options: "i" } },
      ];

      // When searching, we still want to exclude test accounts
      delete filter.email;
      filter.$and = [
        { $or: filter.$or },
        { email: { $not: { $regex: /(test|fake|demo|example)@/i } } },
      ];
      delete filter.$or;
    }

    // Execute query
    const customers = await Customer.find(filter)
      .select("-password")
      .populate({
        path: "roleId",
        select: "name permissions",
      })
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await Customer.countDocuments(filter);

    // Pagination result
    const pagination = {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };

    res.status(200).json({
      success: true,
      pagination,
      data: customers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get single customer
// @route   GET /api/customer/accounts/:id
// @access  Private (Admin only)
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .select("-password")
      .populate("orders")
      .populate({
        path: "roleId",
        select: "name permissions",
      });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (err) {
    console.error(err);

    // Handle invalid ObjectId
    if (err.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Update customer permissions
// @route   PUT /api/customer/accounts/:id/permissions
// @access  Private (Admin only)
exports.updatePermissions = async (req, res) => {
  try {
    const { permissions } = req.body;

    console.log(`Updating permissions for customer ${req.params.id}`);
    console.log("Permissions received:", JSON.stringify(permissions));

    // Find customer by ID
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // If customer doesn't have permissions field yet, initialize it
    if (!customer.permissions) {
      customer.permissions = {};
    }

    // Directly set each permission individually to ensure they're updated
    customer.permissions.adminPanel = permissions.adminPanel === true;
    customer.permissions.cashier = permissions.cashier === true;
    customer.permissions.stats = permissions.stats === true;
    customer.permissions.productsView = permissions.productsView === true;
    customer.permissions.productsEdit = permissions.productsEdit === true;
    customer.permissions.vouchersView = permissions.vouchersView === true;
    customer.permissions.vouchersEdit = permissions.vouchersEdit === true;
    customer.permissions.reservations = permissions.reservations === true;
    customer.permissions.tax = permissions.tax === true;
    customer.permissions.points = permissions.points === true;
    customer.permissions.accounts = permissions.accounts === true;
    customer.permissions.qr = permissions.qr === true;

    console.log(
      "Updated permissions object:",
      JSON.stringify(customer.permissions)
    );

    // Mark permissions as modified to ensure it's saved
    customer.markModified("permissions");

    // Save the customer document
    await customer.save();

    console.log("Customer saved successfully");

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (err) {
    console.error("Error updating permissions:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Suspend customer account
// @route   PUT /api/customer/accounts/:id/suspend
// @access  Private (Admin only)
exports.suspendCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Set status to inactive
    customer.status = "inactive";
    await customer.save();

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Activate customer account
// @route   PUT /api/customer/accounts/:id/activate
// @access  Private (Admin only)
exports.activateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Set status to active
    customer.status = "active";
    await customer.save();

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Delete customer account
// @route   DELETE /api/customer/accounts/:id
// @access  Private (Admin only)
exports.deleteCustomer = async (req, res) => {
  try {
    // Use findByIdAndDelete instead of findById + remove()
    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Log successful deletion
    console.log(`Customer ${req.params.id} deleted successfully`);

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    console.error(`Error deleting customer ${req.params.id}:`, err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
