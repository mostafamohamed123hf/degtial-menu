const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Customer = require("../models/Customer");
const Offer = require("../models/Offer");
const mongoose = require("mongoose");
const { protectCustomer } = require("../middleware/customerAuth");
const GlobalSettings = require("../models/GlobalSettings");
const PointsHistory = require("../models/PointsHistory");

// Add GET endpoint to get all orders (for cashier page)
router.get("/", async (req, res) => {
  try {
    // Extract query parameters
    const { status, tableNumber, limit = 50 } = req.query;

    // Build query object
    const queryObj = {};

    // Filter by status if provided
    if (status) {
      // If multiple statuses are provided as comma-separated values
      if (status.includes(",")) {
        queryObj.status = { $in: status.split(",") };
      } else {
        queryObj.status = status;
      }
    }

    // Filter by table number if provided
    if (tableNumber) {
      queryObj.tableNumber = tableNumber;
    }

    // Get orders with filters, sorted by date (newest first)
    const orders = await Order.find(queryObj)
      .sort({ date: -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving orders",
      error: error.message,
    });
  }
});

// Get all orders for the current customer
router.get("/my-orders", protectCustomer, async (req, res) => {
  try {
    // Make sure the customer is authenticated
    if (!req.customer || !req.customer._id) {
      return res.status(200).json({
        success: false,
        message: "You must be logged in to view orders",
      });
    }

    // Get all orders for this customer, sorted by date (newest first)
    const orders = await Order.find({ customerId: req.customer._id }).sort({
      date: -1,
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving orders",
      error: error.message,
    });
  }
});

// Add a direct POST route for guest orders (no authentication)
router.post("/guest", async (req, res) => {
  try {
    console.log("Received guest order request:", req.body);

    const {
      items,
      subtotal,
      tax,
      serviceTax,
      discount,
      loyaltyDiscount,
      total,
      tableNumber,
      status,
      customerInfo,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one item",
      });
    }

    // Check if mongoose is properly imported
    if (!mongoose || !mongoose.Types || !mongoose.Types.ObjectId) {
      console.error("Mongoose not properly imported");
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    try {
      // Create a temporary customer ID for guest orders
      const guestCustomerId = new mongoose.Types.ObjectId();
      console.log("Created guest customer ID:", guestCustomerId);

      // Generate a unique order number and ID
      const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const randomNum = Math.floor(Math.random() * 900000) + 100000; // 6-digit number
      const orderNumber = `ORD-${dateStr}-${randomNum}`;

      // Create a new order with defaults for missing fields
      const orderData = {
        customerId: guestCustomerId,
        customerName:
          customerInfo && customerInfo.name
            ? customerInfo.name
            : "Guest Customer",
        customerEmail:
          customerInfo && customerInfo.email
            ? customerInfo.email
            : "guest@example.com",
        orderNumber: orderNumber,
        orderId: orderNumber, // Explicitly set orderId to match orderNumber
        items: Array.isArray(items) ? items : [],
        subtotal: subtotal || 0,
        tax: tax || { rate: 0, value: 0 },
        serviceTax: serviceTax || { rate: 0, value: 0 },
        discount: discount || null,
        loyaltyDiscount: loyaltyDiscount || null,
        total: total || 0,
        tableNumber: tableNumber || "0",
        status: status || "pending",
        date: new Date(),
        loyaltyPointsUsed: loyaltyDiscount ? loyaltyDiscount.pointsUsed : 0,
      };

      console.log("Creating order with data:", JSON.stringify(orderData));

      // Create and save the new order
      const newOrder = new Order(orderData);
      const savedOrder = await newOrder.save();

      console.log("Guest order saved successfully:", savedOrder._id);

      // Notify connected clients about the new order
      if (global.notifyClients) {
        global.notifyClients("newOrder", { order: savedOrder });
      }

      res.status(201).json({
        success: true,
        data: savedOrder,
        message: "Guest order placed successfully",
      });
    } catch (mongoError) {
      console.error("Mongoose error when creating order:", mongoError);
      return res.status(500).json({
        success: false,
        message: "Database error when creating order",
        error: mongoError.message,
      });
    }
  } catch (error) {
    console.error("Error creating guest order:", error);
    res.status(500).json({
      success: false,
      message: "Error placing guest order",
      error: error.message,
    });
  }
});

// Create a new order
router.post("/", protectCustomer, async (req, res) => {
  try {
    const {
      items,
      subtotal,
      tax,
      serviceTax,
      discount,
      loyaltyDiscount,
      total,
      tableNumber,
      status,
    } = req.body;

    // Make sure the customer is authenticated
    if (!req.customer || !req.customer._id) {
      return res.status(200).json({
        success: false,
        message: "You must be logged in to place an order",
      });
    }

    // Generate a unique order number
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const randomNum = Math.floor(Math.random() * 900000) + 100000; // 6-digit number
    const orderNumber = `ORD-${dateStr}-${randomNum}`;

    // Create a new order
    const newOrder = new Order({
      customerId: req.customer._id,
      customerName: req.customer.name,
      customerEmail: req.customer.email,
      orderNumber: orderNumber,
      orderId: orderNumber,
      items,
      subtotal,
      tax,
      serviceTax,
      discount,
      loyaltyDiscount,
      total,
      tableNumber,
      status: status || "pending",
      date: new Date(),
      loyaltyPointsUsed: loyaltyDiscount ? loyaltyDiscount.pointsUsed : 0,
    });

    // Save the order
    await newOrder.save();

    // Deduct points for free items at checkout
    const freeItems = items.filter(item => 
      item.isFreeItem && item.pointsRequired > 0
    );

    if (freeItems.length > 0) {
      try {
        const customer = await Customer.findById(req.customer._id);
        if (customer) {
          // Calculate total points to deduct for free items
          const totalPointsToDeduct = freeItems.reduce((sum, item) => {
            return sum + (item.pointsRequired * item.quantity);
          }, 0);

          console.log(`Checkout: Deducting ${totalPointsToDeduct} points for ${freeItems.length} free items`);

          // Deduct points from customer account
          const previousPoints = customer.loyaltyPoints || 0;
          customer.loyaltyPoints = Math.max(0, previousPoints - totalPointsToDeduct);

          // Add points history entry for each free item
          for (const item of freeItems) {
            const pointsDeducted = item.pointsRequired * item.quantity;
            const historyEntry = new PointsHistory({
              customer: customer._id,
              points: -pointsDeducted, // Negative value for deduction
              description: `استبدال عنصر مجاني: ${item.name} (${item.quantity}x) - طلب #${orderNumber}`,
              source: "free_item",
              orderId: newOrder._id,
              orderNumber: orderNumber,
            });
            await historyEntry.save();
          }

          await customer.save();

          console.log(
            `✓ Deducted ${totalPointsToDeduct} points for free items at checkout. Previous: ${previousPoints}, New total: ${customer.loyaltyPoints}`
          );
        }
      } catch (freeItemError) {
        console.error("Error deducting free item points at checkout:", freeItemError);
        // Continue execution, don't fail the order if free item points deduction fails
      }
    }

    // If loyalty points were used, deduct them from the customer's account
    if (loyaltyDiscount && loyaltyDiscount.pointsUsed > 0) {
      try {
        const customer = await Customer.findById(req.customer._id);
        if (customer) {
          // Ensure we don't go below zero
          customer.loyaltyPoints = Math.max(
            0,
            (customer.loyaltyPoints || 0) - loyaltyDiscount.pointsUsed
          );
          await customer.save();

          // Add points history record for the deduction
          const historyEntry = new PointsHistory({
            customer: customer._id,
            points: -loyaltyDiscount.pointsUsed, // Negative value to indicate deduction
            description: `استخدام نقاط للخصم على طلب #${orderNumber}`,
            source: "redeem",
            orderId: newOrder._id,
          });
          await historyEntry.save();

          console.log(
            `Deducted ${loyaltyDiscount.pointsUsed} points from customer ${customer._id}, new total: ${customer.loyaltyPoints}`
          );
        }
      } catch (pointsError) {
        console.error("Error deducting loyalty points:", pointsError);
        // Continue execution, don't fail the order if points deduction fails
      }
    }

    // Notify connected clients about the new order
    if (global.notifyClients) {
      global.notifyClients("newOrder", { order: newOrder });
    }

    res.status(201).json({
      success: true,
      data: newOrder,
      message: "Order placed successfully",
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Error placing order",
      error: error.message,
    });
  }
});

// Add PUT endpoint to update order status (for cashier page)
router.put("/:id", async (req, res) => {
  try {
    // Get the order
    const order = await Order.findById(req.params.id);

    // Check if order exists
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if the order status is being updated to "completed"
    const previousStatus = order.status;
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    // Send WebSocket notification if order is now completed
    if (updatedOrder.status === "completed" && previousStatus !== "completed") {
      // Notify all connected clients about the order completion for rating
      if (global.notifyClients) {
        global.notifyClients("order_completed_for_rating", {
          orderId:
            updatedOrder.orderNumber ||
            updatedOrder.orderId ||
            updatedOrder._id,
          orderNumber: updatedOrder.orderNumber,
          items: updatedOrder.items,
          tableNumber: updatedOrder.tableNumber || "0",
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Refund loyalty points and remove offer claims if the order is being cancelled
    if (updatedOrder.status === "cancelled" && previousStatus !== "cancelled") {
      console.log(`Order ${updatedOrder._id} is being cancelled. Checking for point refund and offer claim removal...`);
      console.log(`loyaltyPointsUsed: ${updatedOrder.loyaltyPointsUsed}`);
      console.log(`customerId: ${updatedOrder.customerId}`);
      
      // Remove offer claims for cancelled orders
      if (
        updatedOrder.customerId &&
        !updatedOrder.customerId.toString().startsWith("new")
      ) {
        try {
          // Check if order contains any offer items
          const offerItems = updatedOrder.items.filter(item => 
            item.id && (item.id.startsWith("offer-") || item.offerId)
          );

          if (offerItems.length > 0) {
            console.log(`Cancelled order contains ${offerItems.length} offer items. Removing claims...`);
            
            // Process each offer item
            for (const item of offerItems) {
              try {
                let offerId = item.offerId;
                
                if (!offerId) {
                  const matchingOffer = await Offer.findOne({
                    title: item.name,
                    discountedPrice: item.price,
                  });
                  
                  if (matchingOffer) {
                    offerId = matchingOffer.id;
                  }
                }

                if (offerId) {
                  const offer = await Offer.findOne({ id: offerId });

                  if (offer && offer.userLimit && offer.userLimit > 0) {
                    const customerIdStr = updatedOrder.customerId.toString();
                    
                    // Remove customer from claimedBy array
                    const claimIndex = offer.claimedBy.findIndex(
                      claim => claim.customerId === customerIdStr
                    );

                    if (claimIndex !== -1) {
                      offer.claimedBy.splice(claimIndex, 1);
                      
                      // Reactivate offer if it was deactivated due to user limit
                      if (!offer.isActive && offer.claimedBy.length < offer.userLimit) {
                        offer.isActive = true;
                        console.log(`Reactivated offer ${offer.id} after claim removal`);
                      }

                      await offer.save();

                      // Notify connected clients about the updated offer
                      if (global.notifyClients) {
                        global.notifyClients("offer_updated", { offer });
                      }

                      console.log(
                        `✓ Removed offer claim for customer ${customerIdStr} on offer ${offerId}. Remaining claims: ${offer.claimedBy.length}/${offer.userLimit}`
                      );
                    }
                  }
                }
              } catch (offerError) {
                console.error(`Error removing offer claim for item ${item.id}:`, offerError);
              }
            }
          }
        } catch (offerRemovalError) {
          console.error("Error removing offer claims:", offerRemovalError);
        }
      }
      
      // Refund points for free items if order is cancelled
      if (
        updatedOrder.customerId &&
        !updatedOrder.customerId.toString().startsWith("new")
      ) {
        try {
          // Check if order contains any free items
          const freeItems = updatedOrder.items.filter(item => 
            item.isFreeItem && item.pointsRequired > 0
          );

          if (freeItems.length > 0) {
            console.log(`Cancelled order contains ${freeItems.length} free items. Processing point refunds...`);
            
            // Find the customer
            const customer = await Customer.findById(updatedOrder.customerId);

            if (customer) {
              // Calculate total points to refund
              const totalPointsToRefund = freeItems.reduce((sum, item) => {
                return sum + (item.pointsRequired * item.quantity);
              }, 0);

              console.log(`Total points to refund for free items: ${totalPointsToRefund}`);

              // Refund points to customer account
              const previousPoints = customer.loyaltyPoints || 0;
              customer.loyaltyPoints = previousPoints + totalPointsToRefund;

              // Add points history entry for each free item refund
              for (const item of freeItems) {
                const pointsRefunded = item.pointsRequired * item.quantity;
                const historyEntry = new PointsHistory({
                  customer: customer._id,
                  points: pointsRefunded, // Positive value for refund
                  description: `استرجاع نقاط عنصر مجاني ملغى: ${item.name} (${item.quantity}x) - طلب #${
                    updatedOrder.orderNumber || updatedOrder._id
                  }`,
                  source: "refund",
                  orderId: updatedOrder._id,
                  orderNumber: updatedOrder.orderNumber || updatedOrder._id.toString(),
                });
                await historyEntry.save();
              }

              await customer.save();

              console.log(
                `✓ Refunded ${totalPointsToRefund} points for free items to customer ${customer._id}. Previous: ${previousPoints}, New total: ${customer.loyaltyPoints}`
              );
            }
          }
        } catch (freeItemRefundError) {
          console.error("Error refunding free item points:", freeItemRefundError);
          // Continue execution, don't fail the order update if free item refund fails
        }
      }
      
      // Check if loyalty points were used in this order
      if (updatedOrder.loyaltyPointsUsed && updatedOrder.loyaltyPointsUsed > 0) {
        console.log(`Order used ${updatedOrder.loyaltyPointsUsed} loyalty points. Processing refund...`);
        
        // Only refund points if this is not a guest order (has a valid customer ID)
        if (
          updatedOrder.customerId &&
          !updatedOrder.customerId.toString().startsWith("new")
        ) {
          try {
            // Find the customer
            const customer = await Customer.findById(updatedOrder.customerId);

            if (customer) {
              console.log(`Found customer ${customer._id}. Current points: ${customer.loyaltyPoints || 0}`);
              
              // Refund the points back to the customer
              const previousPoints = customer.loyaltyPoints || 0;
              customer.loyaltyPoints = previousPoints + updatedOrder.loyaltyPointsUsed;

              // Add to points history for the refund
              const historyEntry = new PointsHistory({
                customer: customer._id,
                points: updatedOrder.loyaltyPointsUsed, // Positive value for refund
                description: `استرجاع نقاط من طلب ملغى #${
                  updatedOrder.orderNumber || updatedOrder._id
                }`,
                source: "refund",
                orderId: updatedOrder._id,
                orderNumber: updatedOrder.orderNumber || updatedOrder._id.toString(),
              });
              await historyEntry.save();

              await customer.save();

              console.log(
                `✓ Successfully refunded ${updatedOrder.loyaltyPointsUsed} loyalty points to customer ${customer._id}. Previous: ${previousPoints}, New total: ${customer.loyaltyPoints}`
              );
            } else {
              console.log(`Customer ${updatedOrder.customerId} not found in database`);
            }
          } catch (refundError) {
            console.error("Error refunding loyalty points:", refundError);
            console.error("Refund error stack:", refundError.stack);
            // Continue execution, don't fail the order update if loyalty points can't be refunded
          }
        } else {
          console.log(`Skipping refund - guest order or invalid customer ID`);
        }
      } else {
        console.log(`No loyalty points were used in this order. Skipping refund.`);
      }
    }

    // Add loyalty points if the order is now marked as completed and wasn't before
    if (updatedOrder.status === "completed" && previousStatus !== "completed") {
      // Track offer claims for completed orders
      if (
        updatedOrder.customerId &&
        !updatedOrder.customerId.toString().startsWith("new")
      ) {
        try {
          // Check if order contains any offer items (items with IDs starting with "offer-")
          const offerItems = updatedOrder.items.filter(item => 
            item.id && (item.id.startsWith("offer-") || item.offerId)
          );

          if (offerItems.length > 0) {
            console.log(`Order ${updatedOrder._id} contains ${offerItems.length} offer items. Processing claims...`);
            
            // Process each offer item
            for (const item of offerItems) {
              try {
                // Extract offer ID - could be stored in offerId field or need to be extracted from item.id
                let offerId = item.offerId;
                
                // If offerId is not directly available, try to extract from item.id (format: "offer-OFFERID")
                if (!offerId && item.id && item.id.startsWith("offer-")) {
                  offerId = item.id.replace("offer-", "");
                  console.log(`Extracted offerId from item.id: ${offerId}`);
                }
                
                // If still no offerId, try to find the offer by matching item details
                // This is a fallback in case the offer ID wasn't stored properly
                if (!offerId) {
                  console.log(`No offerId found for item ${item.id}, attempting to find offer by name/price`);
                  const matchingOffer = await Offer.findOne({
                    $or: [
                      { title: item.name },
                      { titleEn: item.name }
                    ],
                    discountedPrice: item.price
                  });
                  
                  if (matchingOffer) {
                    offerId = matchingOffer.id;
                    console.log(`Found matching offer by name/price: ${offerId}`);
                  }
                }

                if (offerId) {
                  console.log(`Processing offer claim for offerId: ${offerId}`);
                  const offer = await Offer.findOne({ id: offerId });

                  if (!offer) {
                    console.log(`Offer not found in database: ${offerId}`);
                  } else if (!offer.userLimit || offer.userLimit <= 0) {
                    console.log(`Offer ${offerId} has no user limit set, skipping claim tracking`);
                  } else if (offer && offer.userLimit && offer.userLimit > 0) {
                    const customerIdStr = updatedOrder.customerId.toString();
                    
                    // Check if customer has already claimed this offer
                    const alreadyClaimed = offer.claimedBy.some(
                      claim => claim.customerId === customerIdStr
                    );

                    if (!alreadyClaimed) {
                      // Add customer to claimedBy array
                      offer.claimedBy.push({
                        customerId: customerIdStr,
                        claimedAt: new Date(),
                      });

                      // Check if user limit has been reached
                      if (offer.claimedBy.length >= offer.userLimit) {
                        offer.isActive = false;
                        console.log(
                          `Offer ${offer.id} has reached user limit (${offer.userLimit}). Setting to inactive.`
                        );
                      }

                      await offer.save();
                      
                      console.log(
                        `✓ Tracked offer claim for customer ${customerIdStr} on offer ${offerId}. Total claims: ${offer.claimedBy.length}/${offer.userLimit}. Offer isActive: ${offer.isActive}`
                      );

                      // Notify connected clients about the updated offer
                      if (global.notifyClients) {
                        global.notifyClients("offer_updated", { offer });
                      }
                    } else {
                      console.log(`Customer ${customerIdStr} has already claimed offer ${offerId}`);
                    }
                  }
                } else {
                  console.log(`Could not determine offerId for item: ${item.id}, name: ${item.name}`);
                }
              } catch (offerError) {
                console.error(`Error processing offer item ${item.id}:`, offerError);
                // Continue with other items even if one fails
              }
            }
          }
        } catch (offerTrackingError) {
          console.error("Error tracking offer claims:", offerTrackingError);
          // Continue execution, don't fail the order update if offer tracking fails
        }
      }

      // Only add points if this is not a guest order (has a valid customer ID)
      if (
        updatedOrder.customerId &&
        !updatedOrder.customerId.toString().startsWith("new")
      ) {
        try {
          // Find the customer
          const customer = await Customer.findById(updatedOrder.customerId);

          if (customer) {
            // Get the current loyalty points exchange rate from settings
            let exchangeRate = 10; // Default: 10 points per L.E

            try {
              // Try to get settings from database
              const loyaltySettings = await GlobalSettings.findOne({
                key: "loyaltyPointsSettings",
              });

              if (
                loyaltySettings &&
                loyaltySettings.value &&
                loyaltySettings.value.exchangeRate
              ) {
                exchangeRate = loyaltySettings.value.exchangeRate;
              }
            } catch (settingsError) {
              console.error("Error fetching loyalty settings:", settingsError);
              // Continue with default exchange rate
            }

            // Calculate points using the current exchange rate - 1 L.E = exchangeRate points
            const pointsToAdd = Math.floor(updatedOrder.total * exchangeRate);

            // Update customer loyalty points
            customer.loyaltyPoints =
              (customer.loyaltyPoints || 0) + pointsToAdd;

            // Add to points history
            const historyEntry = new PointsHistory({
              customer: customer._id,
              points: pointsToAdd,
              description: `مكافأة على طلب #${
                updatedOrder.orderNumber || updatedOrder._id
              }`,
              source: "order",
              orderId: updatedOrder._id,
              orderNumber: updatedOrder.orderNumber || updatedOrder._id,
            });
            await historyEntry.save();

            await customer.save();

            console.log(
              `Added ${pointsToAdd} loyalty points to customer ${customer._id}, new total: ${customer.loyaltyPoints}`
            );
          }
        } catch (loyaltyError) {
          console.error("Error adding loyalty points:", loyaltyError);
          // Continue execution, don't fail the order update if loyalty points can't be added
        }
      }
    }

    // Notify connected clients about the updated order
    if (global.notifyClients) {
      global.notifyClients("orderUpdated", { order: updatedOrder });
    }

    res.status(200).json({
      success: true,
      data: updatedOrder,
      message: "Order updated successfully",
    });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({
      success: false,
      message: "Error updating order",
      error: error.message,
    });
  }
});

// Add a search endpoint to find orders by orderNumber or orderId
router.get("/search", async (req, res) => {
  try {
    const { orderNumber, orderId } = req.query;

    if (!orderNumber && !orderId) {
      return res.status(400).json({
        success: false,
        message: "Please provide either orderNumber or orderId",
      });
    }

    // Build query object
    const query = {};
    if (orderNumber) {
      query.orderNumber = orderNumber;
    } else if (orderId) {
      query.orderId = orderId;
    }

    // Find the order
    const order = await Order.findOne(query);

    // Check if order exists
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Error searching for order:", error);
    res.status(500).json({
      success: false,
      message: "Error searching for order",
      error: error.message,
    });
  }
});

// Get dashboard statistics
router.get("/stats", async (req, res) => {
  try {
    // Get total number of orders
    const totalOrders = await Order.countDocuments();

    // Calculate total earnings
    const ordersWithTotal = await Order.find({}, "total");
    const totalEarnings = ordersWithTotal.reduce(
      (sum, order) => sum + (order.total || 0),
      0
    );

    // Get recent orders (last 5)
    const recentOrders = await Order.find()
      .sort({ date: -1, createdAt: -1 })
      .limit(5);

    // Get orders by status
    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const processingOrders = await Order.countDocuments({
      status: "processing",
    });
    const completedOrders = await Order.countDocuments({ status: "completed" });
    const cancelledOrders = await Order.countDocuments({ status: "cancelled" });

    // Get today's orders and earnings
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysOrders = await Order.find({
      date: { $gte: today },
    });

    const todaysEarnings = todaysOrders.reduce(
      (sum, order) => sum + (order.total || 0),
      0
    );

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        totalEarnings,
        recentOrders,
        pendingOrders,
        processingOrders,
        completedOrders,
        cancelledOrders,
        todaysOrders: todaysOrders.length,
        todaysEarnings,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving dashboard statistics",
      error: error.message,
    });
  }
});

// Get a single order by ID (no authentication required for cashier access)
router.get("/:id", async (req, res) => {
  try {
    // First try to find by MongoDB ID
    let order = null;

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      order = await Order.findById(req.params.id);
    }

    // If not found, try to find by orderNumber or orderId
    if (!order) {
      order = await Order.findOne({
        $or: [{ orderNumber: req.params.id }, { orderId: req.params.id }],
      });
    }

    // Check if order exists
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving order",
      error: error.message,
    });
  }
});

// Mark an order as rated
router.post("/:id/rate", async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;

    if (!productId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid rating data. Product ID and rating (1-5) are required",
      });
    }

    // Find the order by ID, orderNumber, or orderId
    let order = null;

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      order = await Order.findById(req.params.id);
    }

    if (!order) {
      order = await Order.findOne({
        $or: [{ orderNumber: req.params.id }, { orderId: req.params.id }],
      });
    }

    // Check if order exists
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if the product exists
    const Product = require("../models/Product");
    const product = await Product.findOne({ id: productId });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Create a new rating
    const Rating = require("../models/Rating");
    const newRating = new Rating({
      productId,
      orderId: order.orderNumber || order.orderId || order._id,
      rating,
      comment,
    });

    await newRating.save();

    // Update product's average rating
    const currentRating = product.rating || 0;
    const totalRatings = product.totalRatings || 0;

    // Calculate the new average rating
    const newTotalRatings = totalRatings + 1;
    const newAverageRating =
      (currentRating * totalRatings + rating) / newTotalRatings;

    // Update the product
    await Product.findOneAndUpdate(
      { id: productId },
      {
        rating: parseFloat(newAverageRating.toFixed(1)),
        totalRatings: newTotalRatings,
      }
    );

    // Update the order to mark it as rated
    order.isRated = true;
    await order.save();

    // Notify clients that the order has been rated
    if (global.notifyClients) {
      global.notifyClients("order_rated", {
        orderId: order.orderNumber || order.orderId || order._id,
        tableNumber: order.tableNumber || "0",
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Order rated successfully",
      data: {
        orderId: order.orderNumber || order.orderId || order._id,
        isRated: order.isRated,
        rating: newRating,
      },
    });
  } catch (error) {
    console.error("Error rating order:", error);
    res.status(500).json({
      success: false,
      message: "Error rating order",
      error: error.message,
    });
  }
});

// Reset all stats by deleting all orders
router.delete("/stats/reset", async (req, res) => {
  try {
    // Delete all orders from the database
    const result = await Order.deleteMany({});

    console.log(`Deleted ${result.deletedCount} orders from database`);

    res.status(200).json({
      success: true,
      message: `تم إعادة تعيين الإحصائيات بنجاح. تم حذف ${result.deletedCount} طلب.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error resetting stats:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إعادة تعيين الإحصائيات",
      error: error.message,
    });
  }
});

// Get most ordered products (with explicit /most-ordered-products URL)
router.get("/most-ordered-products", async (req, res) => {
  try {
    // Get the limit from query params or default to 5
    const limit = parseInt(req.query.limit) || 5;

    console.log(`[DEBUG] Fetching most ordered products with limit ${limit}`);

    // Aggregate to find the most ordered products
    const mostOrderedProducts = await Order.aggregate([
      // Unwind the items array to get individual items
      { $unwind: "$items" },
      // Group by product id and sum quantities
      {
        $group: {
          _id: "$items.id",
          name: { $first: "$items.name" },
          nameEn: { $first: "$items.nameEn" },
          image: { $first: "$items.image" },
          totalOrdered: { $sum: "$items.quantity" },
          averagePrice: { $avg: "$items.price" },
        },
      },
      // Sort by total ordered in descending order
      { $sort: { totalOrdered: -1 } },
      // Limit to the requested number of products
      { $limit: limit },
      // Project the fields we want to return
      {
        $project: {
          _id: 0,
          id: "$_id",
          name: 1,
          nameEn: 1,
          image: 1,
          totalOrdered: 1,
          averagePrice: { $round: ["$averagePrice", 2] },
        },
      },
    ]);

    console.log(
      `[DEBUG] Found ${mostOrderedProducts.length} most ordered products`
    );

    res.status(200).json({
      success: true,
      count: mostOrderedProducts.length,
      data: mostOrderedProducts,
    });
  } catch (error) {
    console.error("Error fetching most ordered products:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving most ordered products",
      error: error.message,
    });
  }
});

// Create a direct route to export the most ordered products
// This is a fallback in case the relative route doesn't work
router.get("/api/orders/most-ordered-products", async (req, res) => {
  console.log("[DEBUG] Direct most-ordered-products route accessed");
  try {
    // Get the limit from query params or default to 5
    const limit = parseInt(req.query.limit) || 5;

    // Aggregate to find the most ordered products
  const mostOrderedProducts = await Order.aggregate([
    // Unwind the items array to get individual items
    { $unwind: "$items" },
    // Group by product id and sum quantities
    {
      $group: {
        _id: "$items.id",
        name: { $first: "$items.name" },
        nameEn: { $first: "$items.nameEn" },
        image: { $first: "$items.image" },
        totalOrdered: { $sum: "$items.quantity" },
        averagePrice: { $avg: "$items.price" },
      },
    },
      // Sort by total ordered in descending order
      { $sort: { totalOrdered: -1 } },
      // Limit to the requested number of products
      { $limit: limit },
    // Project the fields we want to return
    {
      $project: {
        _id: 0,
        id: "$_id",
        name: 1,
        nameEn: 1,
        image: 1,
        totalOrdered: 1,
        averagePrice: { $round: ["$averagePrice", 2] },
      },
    },
  ]);

    res.status(200).json({
      success: true,
      count: mostOrderedProducts.length,
      data: mostOrderedProducts,
    });
  } catch (error) {
    console.error(
      "Error fetching most ordered products (direct route):",
      error
    );
    res.status(500).json({
      success: false,
      message: "Error retrieving most ordered products",
      error: error.message,
    });
  }
});

module.exports = router;
