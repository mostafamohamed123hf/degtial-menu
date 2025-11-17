const express = require("express");
const router = express.Router();
const Rating = require("../models/Rating");
const Product = require("../models/Product");
const Order = require("../models/Order");
const mongoose = require("mongoose");

// Get ratings for a product
router.get("/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Find ratings by productId - this works for both custom id and MongoDB _id
    // since we store the productId as-is in the Rating model
    const ratings = await Rating.find({ productId });

    return res.status(200).json({
      success: true,
      data: ratings,
    });
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching ratings",
      error: error.message,
    });
  }
});

// Get ratings for an order
router.get("/order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const ratings = await Rating.find({ orderId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: ratings,
    });
  } catch (error) {
    console.error("Error fetching ratings for order:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching ratings for order",
      error: error.message,
    });
  }
});

// Check if order has been rated
router.get("/order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({
      $or: [
        { orderNumber: orderId },
        { orderId: orderId },
        { _id: mongoose.isValidObjectId(orderId) ? orderId : null },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      isRated: order.isRated,
    });
  } catch (error) {
    console.error("Error checking order rating status:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking order rating status",
      error: error.message,
    });
  }
});

// Check if specific products in an order have been rated
router.get("/order/:orderId/products", async (req, res) => {
  try {
    const { orderId } = req.params;

    // Find all ratings for this order
    const ratings = await Rating.find({ orderId: orderId });

    // Create a map of productId -> rating data
    const ratedProducts = {};
    ratings.forEach((rating) => {
      ratedProducts[rating.productId] = {
        rating: rating.rating,
        comment: rating.comment,
        createdAt: rating.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      ratedProducts: ratedProducts,
    });
  } catch (error) {
    console.error("Error checking product ratings for order:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking product ratings",
      error: error.message,
    });
  }
});

// Create a new rating
router.post("/", async (req, res) => {
  try {
    const { productId, orderId, customerId, rating, comment } = req.body;

    console.log(
      "Rating submission received:",
      JSON.stringify({
        productId,
        originalProductId: req.body.originalProductId || "Not provided",
        orderId,
        customerId,
        rating,
        comment,
      })
    );

    if (!productId || !orderId || !rating || rating < 1 || rating > 5) {
      console.log("Invalid rating data:", { productId, orderId, rating });
      return res.status(400).json({
        success: false,
        message:
          "Invalid rating data. Product ID, Order ID, and rating (1-5) are required",
      });
    }

    // Check if order exists and is completed - improved query to handle different ID formats
    const orderQuery = {
      $or: [{ orderNumber: orderId }, { orderId: orderId }],
    };

    // Only add MongoDB ObjectId check if it's a valid ObjectId
    if (mongoose.isValidObjectId(orderId)) {
      orderQuery.$or.push({ _id: orderId });
    }

    console.log("Looking for order with query:", JSON.stringify(orderQuery));
    const order = await Order.findOne(orderQuery);

    if (!order) {
      console.log("Order not found for ID:", orderId);
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    console.log(
      "Found order:",
      JSON.stringify({
        _id: order._id,
        orderNumber: order.orderNumber,
        orderId: order.orderId,
        status: order.status,
        isRated: order.isRated,
      })
    );

    if (order.status !== "completed") {
      console.log("Order status is not completed:", order.status);
      return res.status(400).json({
        success: false,
        message: "Only completed orders can be rated",
      });
    }

    // Disallow rating again if the whole order has already been rated
    if (order.isRated === true) {
      console.log("Order has already been rated globally (isRated=true)");
      return res.status(400).json({
        success: false,
        message: "This order has already been rated",
      });
    }

    // Check if this specific product in this order has already been rated
    const existingRating = await Rating.findOne({
      productId: productId,
      orderId: orderId,
    });

    if (existingRating) {
      console.log("This product in this order has already been rated");
      return res.status(400).json({
        success: false,
        message: "This product in this order has already been rated",
      });
    }

    // Check if product exists - handle both custom 'id' field and MongoDB '_id'
    let product = await Product.findOne({ id: productId });
    
    // If not found by custom id, try MongoDB ObjectId (for free items)
    if (!product && mongoose.isValidObjectId(productId)) {
      product = await Product.findById(productId);
    }
    
    if (!product) {
      console.log("Product not found for ID:", productId);
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    console.log(
      "Found product:",
      JSON.stringify({
        id: product.id,
        name: product.name,
        rating: product.rating,
        totalRatings: product.totalRatings,
      })
    );

    // Create the rating object
    const ratingData = {
      productId,
      orderId,
      rating,
      comment,
    };

    // Only add customerId if it exists and is valid
    if (customerId && mongoose.isValidObjectId(customerId)) {
      ratingData.customerId = customerId;
    }

    console.log("Creating rating with data:", JSON.stringify(ratingData));

    try {
      // Create the rating
      const newRating = new Rating(ratingData);
      await newRating.save();
      console.log("Rating saved successfully");

      // Get all ratings for this product from the database to calculate accurate average
      // This handles cases where previous ratings may have been saved but not applied to the product
      const allRatings = await Rating.find({ productId: productId });
      
      // Calculate the average rating from all actual ratings in the database
      const totalRatingsCount = allRatings.length;
      const sumOfRatings = allRatings.reduce((sum, r) => sum + r.rating, 0);
      const newAverageRating = totalRatingsCount > 0 ? sumOfRatings / totalRatingsCount : 0;

      console.log("Updating product rating:", {
        productId: productId,
        previousRating: product.rating || 0,
        previousTotalRatings: product.totalRatings || 0,
        actualRatingsInDB: totalRatingsCount,
        newAverageRating: parseFloat(newAverageRating.toFixed(1)),
        allRatingsValues: allRatings.map(r => r.rating)
      });

      // Update the product - use the product's actual _id from MongoDB
      // This ensures we update the correct product regardless of which ID was used to find it
      await Product.findByIdAndUpdate(
        product._id,
        {
          rating: parseFloat(newAverageRating.toFixed(1)),
          totalRatings: totalRatingsCount,
        }
      );
      console.log("Product rating updated successfully using _id:", product._id);

      // Mark the order as rated globally to prevent any further ratings
      try {
        order.isRated = true;
        await order.save();
        console.log("Order marked as rated (isRated=true)");
      } catch (saveErr) {
        console.error("Failed to mark order as rated:", saveErr);
      }

      console.log("Rating submitted successfully for product:", productId);
      return res.status(201).json({
        success: true,
        data: newRating,
        message: "Rating submitted successfully",
      });
    } catch (innerError) {
      console.error("Error during rating operations:", innerError);
      throw innerError; // Re-throw to be caught by outer catch block
    }
  } catch (error) {
    console.error("Error submitting rating:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Error submitting rating",
      error: error.message,
    });
  }
});

// Mark order rating as skipped
router.post("/order/:orderId/skip", async (req, res) => {
  try {
    const { orderId } = req.params;

    // Find the order using multiple possible ID formats
    const orderQuery = {
      $or: [{ orderNumber: orderId }, { orderId: orderId }],
    };

    if (mongoose.isValidObjectId(orderId)) {
      orderQuery.$or.push({ _id: orderId });
    }

    const order = await Order.findOne(orderQuery);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Mark the order as rating skipped
    order.ratingSkipped = true;
    await order.save();

    console.log(`Order ${orderId} marked as rating skipped`);

    return res.status(200).json({
      success: true,
      message: "Order rating marked as skipped",
    });
  } catch (error) {
    console.error("Error marking order rating as skipped:", error);
    return res.status(500).json({
      success: false,
      message: "Error marking order rating as skipped",
      error: error.message,
    });
  }
});

module.exports = router;
