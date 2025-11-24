const Voucher = require("../models/Voucher");
const { validationResult } = require("express-validator");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all vouchers
// @route   GET /api/vouchers
// @access  Private (admin)
exports.getVouchers = async (req, res, next) => {
  try {
    const vouchers = await Voucher.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: vouchers.length,
      data: vouchers,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single voucher
// @route   GET /api/vouchers/:id
// @access  Private (admin)
exports.getVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      return next(
        new ErrorResponse(`Voucher not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: voucher,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new voucher
// @route   POST /api/vouchers
// @access  Private (admin)
exports.createVoucher = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    // Add user to req.body if available
    if (req.user && req.user.id) {
      req.body.createdBy = req.user.id;
    }

    const voucher = await Voucher.create(req.body);

    // Notify all clients about new voucher
    if (global.notifyClients) {
      global.notifyClients("voucher_created", {
        voucherId: voucher._id,
        code: voucher.code,
        type: voucher.type,
        value: voucher.value,
      });
    }

    res.status(201).json({
      success: true,
      data: voucher,
    });
  } catch (err) {
    // Handle duplicate code error
    if (err.code === 11000) {
      return next(new ErrorResponse("Voucher code already exists", 400));
    }
    next(err);
  }
};

// @desc    Update voucher
// @route   PUT /api/vouchers/:id
// @access  Private (admin)
exports.updateVoucher = async (req, res, next) => {
  try {
    let voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      return next(
        new ErrorResponse(`Voucher not found with id of ${req.params.id}`, 404)
      );
    }

    // Prevent updating the code if voucher has been used
    if (req.body.code && voucher.usedCount > 0) {
      return next(
        new ErrorResponse(
          "Cannot change code for a voucher that has been used",
          400
        )
      );
    }

    voucher = await Voucher.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Notify all clients about updated voucher
    if (global.notifyClients) {
      global.notifyClients("voucher_updated", {
        voucherId: voucher._id,
        code: voucher.code,
        isActive: voucher.isActive,
      });
    }

    res.status(200).json({
      success: true,
      data: voucher,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete voucher
// @route   DELETE /api/vouchers/:id
// @access  Private (admin)
exports.deleteVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      return next(
        new ErrorResponse(`Voucher not found with id of ${req.params.id}`, 404)
      );
    }

    // Prevent deleting a voucher that has been used
    if (voucher.usedCount > 0) {
      return next(
        new ErrorResponse(
          "Cannot delete a voucher that has been used. Deactivate it instead.",
          400
        )
      );
    }

    await Voucher.deleteOne({ _id: voucher._id });

    // Notify all clients about deleted voucher
    if (global.notifyClients) {
      global.notifyClients("voucher_deleted", {
        voucherId: voucher._id,
        code: voucher.code,
      });
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Validate voucher code
// @route   POST /api/vouchers/validate
// @access  Public
exports.validateVoucher = async (req, res, next) => {
  try {
    const { code, orderValue, items } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "الرجاء توفير رمز القسيمة",
      });
    }

    console.log(`Validating voucher code: ${code}, orderValue: ${orderValue}`);

    // Create a test voucher if validating TEST123 and it doesn't exist
    if (code.toUpperCase() === "TEST123") {
      let testVoucher = await Voucher.findOne({ code: "TEST123" });

      if (!testVoucher) {
        console.log("Creating test voucher TEST123");
        testVoucher = await Voucher.create({
          code: "TEST123",
          type: "percentage",
          value: 10, // 10% discount
          minOrderValue: 0,
          isActive: true,
          description: "Test voucher for debugging",
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          maxUses: null,
          usedCount: 0,
        });

        console.log("Test voucher created:", testVoucher);
      }
    }

    const voucher = await Voucher.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!voucher) {
      console.log(`Voucher not found: ${code}`);
      return res.status(200).json({
        success: false,
        message: "كود القسيمة غير صالح أو غير موجود",
      });
    }

    console.log(`Voucher found: ${voucher.code}, checking validity`);

    // Determine eligible subtotal based on applicable categories/products
    let eligibleSubtotal = 0;

    try {
      // If specific categories or products are set, compute eligible subtotal from items
      const hasCategoryRestriction = Array.isArray(voucher.applicableCategories) && voucher.applicableCategories.length > 0;
      const hasProductRestriction = Array.isArray(voucher.applicableProducts) && voucher.applicableProducts.length > 0;

      if ((hasCategoryRestriction || hasProductRestriction) && Array.isArray(items) && items.length > 0) {
        const Product = require("../models/Product");
        for (const item of items) {
          const productId = item.id || item.productId || item._id;
          const qty = parseInt(item.quantity || 1);
          const price = parseFloat(item.price || 0);

          if (!productId || !qty || !price) continue;

          let matches = false;

          if (hasProductRestriction) {
            // Match by product ObjectId
            matches = voucher.applicableProducts.some((p) => String(p) === String(productId));
          }

          if (!matches && hasCategoryRestriction) {
            // Look up product category when needed
            const prod = await Product.findOne({
              $or: [
                { id: productId },
                { _id: productId },
              ],
            }).select("category");
            const category = prod ? prod.category : null;
            matches = !!category && voucher.applicableCategories.includes(category);
          }

          if (matches) {
            eligibleSubtotal += price * qty;
          }
        }
      } else {
        // No restrictions or no items provided: default to full orderValue
        eligibleSubtotal = parseFloat(orderValue || 0);
      }
    } catch (e) {
      // Fallback to orderValue if any error occurs during eligibility computation
      eligibleSubtotal = parseFloat(orderValue || 0);
    }

    // If voucher has category/product restriction but no eligible items, treat as invalid
    const hasRestriction = (
      Array.isArray(voucher.applicableCategories) && voucher.applicableCategories.length > 0
    ) || (
      Array.isArray(voucher.applicableProducts) && voucher.applicableProducts.length > 0
    );

    if (hasRestriction && eligibleSubtotal <= 0) {
      return res.status(200).json({
        success: false,
        message: "لا يمكن تطبيق القسيمة على عناصر السلة الحالية",
        data: { isValid: false, reason: "not_applicable" },
      });
    }

    // Check if voucher is valid for this eligible amount
    if (!voucher.isValid(eligibleSubtotal || 0)) {
      let reason = "";
      const now = new Date();

      if (now > voucher.endDate) {
        reason = "منتهي الصلاحية";
      } else if (now < voucher.startDate) {
        reason = "لم يبدأ بعد";
      } else if (
        voucher.maxUses !== null &&
        voucher.usedCount >= voucher.maxUses
      ) {
        reason = "تم استخدام الحد الأقصى من المرات";
      } else if (orderValue < voucher.minOrderValue) {
        reason = `لم يتم الوصول للحد الأدنى للطلب (${voucher.minOrderValue})`;
      }

      console.log(`Voucher ${code} invalid, reason: ${reason}`);

      return res.status(200).json({
        success: false,
        message: `لا يمكن تطبيق القسيمة: ${reason}`,
        data: {
          isValid: false,
          reason,
          minOrderValue: voucher.minOrderValue,
        },
      });
    }

    // Calculate discount on eligible subtotal
    const discountAmount = voucher.calculateDiscount(eligibleSubtotal || 0);

    console.log(`Voucher ${code} valid, discount amount: ${discountAmount}`);

    res.status(200).json({
      success: true,
      data: {
        isValid: true,
        voucherId: voucher._id,
        code: voucher.code,
        type: voucher.type,
        value: voucher.value,
        applicableCategories: voucher.applicableCategories || [],
        applicableProducts: voucher.applicableProducts || [],
        discountAmount,
        originalValue: eligibleSubtotal || 0,
        finalValue: (eligibleSubtotal || 0) - discountAmount,
      },
    });
  } catch (err) {
    console.error(`Error validating voucher: ${err.message}`);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء التحقق من القسيمة",
      error: err.message,
    });
  }
};

// @desc    Apply voucher to order (increment usage count)
// @route   POST /api/vouchers/apply
// @access  Private
exports.applyVoucher = async (req, res, next) => {
  try {
    const { voucherId, orderValue, items } = req.body;

    if (!voucherId) {
      return next(new ErrorResponse("Please provide a voucher ID", 400));
    }

    const voucher = await Voucher.findById(voucherId);

    if (!voucher) {
      return next(new ErrorResponse("Voucher not found", 404));
    }

    // Compute eligible subtotal similar to validate
    let eligibleSubtotal = 0;
    try {
      const hasCategoryRestriction = Array.isArray(voucher.applicableCategories) && voucher.applicableCategories.length > 0;
      const hasProductRestriction = Array.isArray(voucher.applicableProducts) && voucher.applicableProducts.length > 0;

      if ((hasCategoryRestriction || hasProductRestriction) && Array.isArray(items) && items.length > 0) {
        const Product = require("../models/Product");
        for (const item of items) {
          const productId = item.id || item.productId || item._id;
          const qty = parseInt(item.quantity || 1);
          const price = parseFloat(item.price || 0);
          if (!productId || !qty || !price) continue;

          let matches = false;
          if (hasProductRestriction) {
            matches = voucher.applicableProducts.some((p) => String(p) === String(productId));
          }
          if (!matches && hasCategoryRestriction) {
            const prod = await Product.findOne({
              $or: [
                { id: productId },
                { _id: productId },
              ],
            }).select("category");
            const category = prod ? prod.category : null;
            matches = !!category && voucher.applicableCategories.includes(category);
          }
          if (matches) {
            eligibleSubtotal += price * qty;
          }
        }
      } else {
        eligibleSubtotal = parseFloat(orderValue || 0);
      }
    } catch (_) {
      eligibleSubtotal = parseFloat(orderValue || 0);
    }

    // Validate against eligible subtotal
    if (!voucher.isValid(eligibleSubtotal || 0)) {
      return res.status(400).json({
        success: false,
        message: "Voucher is not valid for this order",
        data: { isValid: false },
      });
    }

    // Increment usage count
    voucher.usedCount += 1;
    await voucher.save();

    // Calculate discount
    const discountAmount = voucher.calculateDiscount(eligibleSubtotal || 0);

    res.status(200).json({
      success: true,
      message: "Voucher applied successfully",
      data: {
        voucherId: voucher._id,
        code: voucher.code,
        type: voucher.type,
        value: voucher.value,
        applicableCategories: voucher.applicableCategories || [],
        applicableProducts: voucher.applicableProducts || [],
        discountAmount,
        originalValue: eligibleSubtotal || 0,
        finalValue: (eligibleSubtotal || 0) - discountAmount,
        usedCount: voucher.usedCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get public vouchers
// @route   GET /api/vouchers/public
// @access  Public
exports.getPublicVouchers = async (req, res, next) => {
  try {
    // Only return active, non-expired, and non-admin vouchers
    const currentDate = new Date();

    const vouchers = await Voucher.find({
      isActive: true,
      endDate: { $gt: currentDate },
      requiresAdmin: { $ne: true }, // Skip admin-only vouchers
    }).select("code type value minOrderValue description startDate endDate");

    res.status(200).json({
      success: true,
      count: vouchers.length,
      data: vouchers,
    });
  } catch (err) {
    next(err);
  }
};
