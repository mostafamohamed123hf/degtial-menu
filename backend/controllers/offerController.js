const Offer = require("../models/Offer");
const Order = require("../models/Order");
const Customer = require("../models/Customer");

/**
 * Check if a customer is eligible for an offer based on customer eligibility rules
 * @param {Object} offer - The offer object
 * @param {Object} customer - The customer object
 * @returns {Promise<Object>} - { eligible: boolean, reason: string }
 */
async function checkCustomerEligibility(offer, customer) {
  // If offer is for all customers, they're eligible
  if (!offer.customerEligibility || offer.customerEligibility === "all") {
    return { eligible: true, reason: null };
  }

  // If no customer is provided, handle based on eligibility type
  if (!customer || !customer._id) {
    // For "new" customer offers, unauthenticated users could be eligible
    // but we require them to create an account first
    if (offer.customerEligibility === "new") {
      return { 
        eligible: false, 
        reason: "Please create an account to claim this new customer offer" 
      };
    }
    // For other restricted offers, they need an account
    return { 
      eligible: false, 
      reason: "This offer requires a customer account" 
    };
  }

  const customerId = customer._id;

  // Check based on eligibility type
  switch (offer.customerEligibility) {
    case "new":
      // New customer = hasn't ordered before (account exists but no orders)
      // Count ALL orders (not just completed) to determine if customer is "new"
      const existingOrders = await Order.countDocuments({ 
        customerId: customerId 
      });
      
      console.log(`[Customer Eligibility Check - NEW] Customer ID: ${customerId}, Total Orders (all statuses): ${existingOrders}, Offer: ${offer.id || offer._id}`);
      
      if (existingOrders > 0) {
        console.log(`[Customer Eligibility Check - NEW] Customer has ${existingOrders} orders, NOT eligible for new customer offer`);
        return { 
          eligible: false, 
          reason: "This offer is only available for new customers who haven't placed an order yet" 
        };
      }
      // Customer has account but no orders = eligible for new customer offers
      console.log(`[Customer Eligibility Check - NEW] Customer has 0 orders, IS eligible for new customer offer`);
      return { eligible: true, reason: null };

    case "existing":
      // Existing customer = account created before this offer was created
      const offerCreatedAt = new Date(offer.createdAt);
      const customerCreatedAt = new Date(customer.createdAt);
      
      if (customerCreatedAt >= offerCreatedAt) {
        return { 
          eligible: false, 
          reason: "This offer is only available for existing customers who registered before this offer was created" 
        };
      }
      return { eligible: true, reason: null };

    case "loyalty":
      // Loyalty customer = has specific minimum loyalty points
      const customerPoints = customer.loyaltyPoints || 0;
      const requiredPoints = offer.minLoyaltyPoints || 0;
      
      if (customerPoints < requiredPoints) {
        return { 
          eligible: false, 
          reason: `This offer requires at least ${requiredPoints} loyalty points. You have ${customerPoints} points.` 
        };
      }
      return { eligible: true, reason: null };

    default:
      return { eligible: true, reason: null };
  }
}

// @desc    Get all offers
// @route   GET /api/offers
// @access  Public
exports.getOffers = async (req, res) => {
  try {
    const { category, active } = req.query;
    const filter = {};

    if (category && category !== "all") {
      filter.category = category;
    }

    if (active !== undefined) {
      filter.isActive = active === "true";
    }

    const offers = await Offer.find(filter).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: offers.length,
      data: offers,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// @desc    Get single offer
// @route   GET /api/offers/:id
// @access  Public
exports.getOffer = async (req, res) => {
  try {
    const offer = await Offer.findOne({ id: req.params.id });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: offer,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// @desc    Create new offer
// @route   POST /api/offers
// @access  Private
exports.createOffer = async (req, res) => {
  try {
    const offer = await Offer.create(req.body);

    // Notify connected clients about the new offer
    if (global.notifyClients) {
      global.notifyClients("offer_created", { offer });
    }

    res.status(201).json({
      success: true,
      data: offer,
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: messages,
      });
    }

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Offer with this ID already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// @desc    Update offer
// @route   PUT /api/offers/:id
// @access  Private
exports.updateOffer = async (req, res) => {
  try {
    let offer = await Offer.findOne({ id: req.params.id });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    // Check if offer is being reactivated (was inactive, now active)
    const wasInactive = !offer.isActive;
    const isBeingActivated = req.body.isActive === true;

    // If offer is being reactivated, reset the claimedBy array to allow users to claim again
    if (wasInactive && isBeingActivated && offer.userLimit && offer.userLimit > 0) {
      req.body.claimedBy = [];
      console.log(
        `Offer ${offer.id} is being reactivated. Resetting claimedBy array to allow users to claim again.`
      );
    }

    offer = await Offer.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, updatedAt: Date.now() },
      {
        new: true,
        runValidators: true,
      }
    );

    // Notify connected clients about the updated offer
    if (global.notifyClients) {
      global.notifyClients("offer_updated", { offer });
    }

    res.status(200).json({
      success: true,
      data: offer,
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// @desc    Delete offer
// @route   DELETE /api/offers/:id
// @access  Private
exports.deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findOne({ id: req.params.id });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    const deletedOffer = {
      id: offer.id,
      title: offer.title,
    };

    await Offer.findOneAndDelete({ id: req.params.id });

    // Notify connected clients about the deleted offer
    if (global.notifyClients) {
      global.notifyClients("offer_deleted", { offer: deletedOffer });
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    console.error("Error deleting offer:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// @desc    Get featured offer
// @route   GET /api/offers/featured
// @access  Public
exports.getFeaturedOffer = async (req, res) => {
  try {
    const offer = await Offer.findOne({ isFeatured: true, isActive: true });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "No featured offer found",
      });
    }

    res.status(200).json({
      success: true,
      data: offer,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// @desc    Get eligible offers for authenticated customer based on their spending
// @route   GET /api/offers/eligible
// @access  Private
exports.getEligibleOffers = async (req, res) => {
  try {
    console.log(`[Get Eligible Offers] Request received, Customer authenticated: ${!!(req.customer && req.customer._id)}`);
    
    const { category, active } = req.query;
    const filter = { isActive: true };

    if (category && category !== "all") {
      filter.category = category;
    }

    if (active !== undefined) {
      filter.isActive = active === "true";
    }

    // Get all active offers
    const allOffers = await Offer.find(filter).sort({ createdAt: -1 });

    // If customer is authenticated, filter based on spending, user limit, and customer eligibility
    if (req.customer && req.customer._id) {
      console.log(`[Get Eligible Offers] Authenticated customer: ${req.customer._id}, Email: ${req.customer.email}`);
      
      // Calculate customer's total spending from completed orders only
      const completedOrders = await Order.find({
        customerId: req.customer._id,
        status: "completed",
      });

      const totalSpending = completedOrders.reduce((sum, order) => {
        return sum + (order.total || 0);
      }, 0);
      
      console.log(`[Get Eligible Offers] Total completed orders: ${completedOrders.length}, Total spending: ${totalSpending}`);

      // Filter offers based on minimum purchase requirement, user limit, and customer eligibility
      const eligibilityChecks = await Promise.all(
        allOffers.map(async (offer) => {
          // Check minimum purchase requirement
          if (offer.minPurchase && offer.minPurchase > 0) {
            if (totalSpending < offer.minPurchase) {
              return { offer, eligible: false };
            }
          }

          // Check if user has already claimed this offer via completed orders (if userLimit is set)
          if (offer.userLimit && offer.userLimit > 0) {
            const customerIdStr = req.customer._id.toString();
            
            // Check the claimedBy array which is populated on order completion
            const alreadyClaimed = offer.claimedBy.some(
              (claim) => claim.customerId === customerIdStr
            );
            
            if (alreadyClaimed) {
              console.log(`[Offer Filtered] Customer ${customerIdStr} has already completed an order with offer ${offer.id}`);
              return { offer, eligible: false };
            }
            
            // Also check if the offer has reached its user limit
            if (offer.claimedBy.length >= offer.userLimit) {
              console.log(`[Offer Filtered] Offer ${offer.id} has reached user limit (${offer.userLimit})`);
              return { offer, eligible: false };
            }
          }

          // Check customer eligibility (new, existing, loyalty)
          const eligibilityResult = await checkCustomerEligibility(offer, req.customer);
          if (!eligibilityResult.eligible) {
            console.log(`[Offer Filtered Out] Offer: ${offer.id}, Reason: ${eligibilityResult.reason}`);
            return { offer, eligible: false };
          }

          console.log(`[Offer Eligible] Offer: ${offer.id}, Customer Eligibility: ${offer.customerEligibility}`);
          return { offer, eligible: true };
        })
      );

      const eligibleOffers = eligibilityChecks
        .filter((result) => result.eligible)
        .map((result) => result.offer);

      console.log(`[Get Eligible Offers] Customer: ${req.customer._id}, Total Offers: ${allOffers.length}, Eligible Offers: ${eligibleOffers.length}`);
      
      return res.status(200).json({
        success: true,
        count: eligibleOffers.length,
        data: eligibleOffers,
        customerSpending: totalSpending,
      });
    }

    // If not authenticated, return all offers (minPurchase check will be on frontend)
    res.status(200).json({
      success: true,
      count: allOffers.length,
      data: allOffers,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// @desc    Claim an offer (add to cart) - No longer tracks claims, just validates
// @route   POST /api/offers/:id/claim
// @access  Public
exports.claimOffer = async (req, res) => {
  try {
    const offer = await Offer.findOne({ id: req.params.id });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    // Check if offer is active
    if (!offer.isActive) {
      return res.status(400).json({
        success: false,
        message: "This offer is no longer active",
      });
    }

    // If customer is authenticated, check eligibility (but don't track the claim yet)
    if (req.customer && req.customer._id) {
      // Check customer eligibility
      const eligibilityResult = await checkCustomerEligibility(offer, req.customer);
      if (!eligibilityResult.eligible) {
        return res.status(403).json({
          success: false,
          message: eligibilityResult.reason,
        });
      }
    }

    // Return success - actual claim tracking will happen on order completion
    res.status(200).json({
      success: true,
      message: "Offer added to cart successfully",
      data: offer,
    });
  } catch (err) {
    console.error("Error adding offer to cart:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};
