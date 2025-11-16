const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const DiscountedProduct = require("../models/DiscountedProduct");
const GlobalSettings = require("../models/GlobalSettings");
const Category = require("../models/Category");

// Get all products
router.get("/", async (req, res) => {
  try {
    console.log("GET /api/products - Fetching products from database...");

    // Check if a global discount is active
    const discountStatus = await GlobalSettings.findOne({
      key: "discountActive",
    });
    const isDiscountActive = discountStatus && discountStatus.value === true;

    // Fetch all categories to get their sortOrder
    const categories = await Category.find();
    const categorySortMap = {};
    categories.forEach((cat) => {
      categorySortMap[cat.value] = cat.sortOrder || 0;
    });

    let products;

    if (isDiscountActive) {
      // If discount is active, fetch both original and discounted products
      const originalProducts = await Product.find();
      const discountedProducts = await DiscountedProduct.find();

      // Create a map for quick lookup of discounted products
      const discountedMap = {};
      discountedProducts.forEach((dp) => {
        discountedMap[dp.originalProductId] = dp;
      });

      // Merge the products with discounted prices
      products = originalProducts.map((product) => {
        const discounted = discountedMap[product.id];
        if (discounted) {
          // Return a merged product with discounted price
          const mergedProduct = {
            ...product.toObject(),
            price: discounted.discountedPrice,
            originalPrice: discounted.originalPrice,
            discountPercentage: discounted.discountPercentage,
          };
          return mergedProduct;
        }
        return product;
      });

      console.log(`Found ${products.length} products with discount applied`);
    } else {
      // If no discount is active, just fetch regular products
      products = await Product.find();
      console.log(
        `Found ${products.length} regular products (no discount active)`
      );
    }

    // Sort products by category sortOrder, then by product name
    products.sort((a, b) => {
      const categoryOrderA = categorySortMap[a.category] || 999;
      const categoryOrderB = categorySortMap[b.category] || 999;

      // First sort by category sortOrder
      if (categoryOrderA !== categoryOrderB) {
        return categoryOrderA - categoryOrderB;
      }

      // If same category, sort by product name
      return (a.name || "").localeCompare(b.name || "");
    });

    if (products.length === 0) {
      console.log("No products found in database");
    } else {
      console.log("First product:", products[0]);
      console.log("Products sorted by category sortOrder");
    }

    res.json({
      success: true,
      data: products,
      message: "Products retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message,
    });
  }
});

// Get product by ID
router.get("/:id", async (req, res) => {
  try {
    console.log(`Fetching product with ID: ${req.params.id}`);

    // First try to find by the custom ID field
    let product = await Product.findOne({ id: req.params.id });

    // If not found, try with MongoDB's _id as fallback
    if (!product) {
      try {
        product = await Product.findById(req.params.id);
      } catch (error) {
        console.log("Invalid MongoDB ID format, skipping _id lookup");
      }
    }

    // Check if product exists
    if (!product) {
      console.log(`Product with ID ${req.params.id} not found`);
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if a global discount is active
    const discountStatus = await GlobalSettings.findOne({
      key: "discountActive",
    });
    const isDiscountActive = discountStatus && discountStatus.value === true;

    // If discount is active, check if this product has a discount
    if (isDiscountActive) {
      const discountedProduct = await DiscountedProduct.findOne({
        originalProductId: product.id,
      });

      if (discountedProduct) {
        // Add discount information to the product
        product = {
          ...product.toObject(),
          price: discountedProduct.discountedPrice,
          originalPrice: discountedProduct.originalPrice,
          discountPercentage: discountedProduct.discountPercentage,
        };
      }
    }

    // Log add-ons information for debugging
    if (product.addOns && product.addOns.length > 0) {
      console.log(
        `Product ${product.name} has ${product.addOns.length} add-on sections:`
      );
      product.addOns.forEach((section, index) => {
        console.log(
          `  Section ${index + 1}: ${section.title} (Required: ${
            section.required
          })`
        );
        console.log(`    Options: ${section.options.length} options`);
        section.options.forEach((option) => {
          console.log(`      - ${option.name}: +${option.price}`);
        });
      });
    } else {
      console.log(`Product ${product.name} has no add-ons`);
    }

    res.json({
      success: true,
      data: product,
      message: "Product retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: error.message,
    });
  }
});

// Create new product
router.post("/", async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({
      success: true,
      data: product,
      message: "Product created successfully",
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(400).json({
      success: false,
      message: "Error creating product",
      error: error.message,
    });
  }
});

// Update product
router.put("/:id", async (req, res) => {
  try {
    console.log(`Updating product with ID: ${req.params.id}`, req.body);

    // First try to find by the custom ID field
    let product = await Product.findOne({ id: req.params.id });

    // If not found, try with MongoDB's _id as fallback
    if (!product) {
      product = await Product.findById(req.params.id);
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Update the product with the new data
    Object.assign(product, req.body);
    await product.save();

    res.json({
      success: true,
      data: product,
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(400).json({
      success: false,
      message: "Error updating product",
      error: error.message,
    });
  }
});

// Delete product
router.delete("/:id", async (req, res) => {
  try {
    console.log(`Deleting product with ID: ${req.params.id}`);

    // First try to find by the custom ID field
    let product = await Product.findOne({ id: req.params.id });

    // If not found, try with MongoDB's _id as fallback
    if (!product) {
      product = await Product.findById(req.params.id);
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Delete the product
    await product.deleteOne();

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting product",
      error: error.message,
    });
  }
});

// Apply global discount to all products
router.post("/discount", async (req, res) => {
  try {
    const { discountPercentage, originalPrices } = req.body;

    if (
      !discountPercentage ||
      discountPercentage <= 0 ||
      discountPercentage > 90
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid discount percentage. Must be between 0 and 90.",
      });
    }

    console.log(`Applying ${discountPercentage}% discount to all products`);

    // First, clear any existing discounted products
    await DiscountedProduct.deleteMany({});
    console.log("Cleared existing discounted products");

    // Set discount active flag
    await GlobalSettings.findOneAndUpdate(
      { key: "discountActive" },
      { key: "discountActive", value: true },
      { upsert: true, new: true }
    );
    console.log("Set discount active flag to true");

    // Store discount percentage
    await GlobalSettings.findOneAndUpdate(
      { key: "discountPercentage" },
      { key: "discountPercentage", value: discountPercentage },
      { upsert: true, new: true }
    );
    console.log(`Stored discount percentage: ${discountPercentage}%`);

    // Get all products
    const products = await Product.find();
    console.log(`Found ${products.length} products to apply discount to`);

    const discountedProducts = [];
    const bulkOperations = [];

    // Create discounted products
    for (const product of products) {
      if (originalPrices[product.id]) {
        const originalPrice = originalPrices[product.id];
        const discountFactor = 1 - discountPercentage / 100;
        const discountedPrice =
          Math.round(originalPrice * discountFactor * 100) / 100;

        // Create a discounted product entry
        const discountedProduct = new DiscountedProduct({
          originalProductId: product.id,
          name: product.name,
          description: product.description,
          originalPrice: originalPrice,
          discountedPrice: discountedPrice,
          discountPercentage: discountPercentage,
          category: product.category,
          image: product.image,
          rating: product.rating,
        });

        bulkOperations.push(discountedProduct);
        discountedProducts.push({
          id: product.id,
          originalPrice,
          discountedPrice,
        });
      }
    }

    // Save all discounted products in one batch operation
    if (bulkOperations.length > 0) {
      await DiscountedProduct.insertMany(bulkOperations);
      console.log(
        `Created ${bulkOperations.length} discounted product entries`
      );
    }

    res.json({
      success: true,
      message: `Applied ${discountPercentage}% discount to all products`,
      data: {
        discountPercentage,
        discountedProductsCount: discountedProducts.length,
        discountedProducts: discountedProducts.slice(0, 5), // Send first 5 as sample
      },
    });
  } catch (error) {
    console.error("Error applying global discount:", error);
    res.status(500).json({
      success: false,
      message: "Error applying global discount",
      error: error.message,
    });
  }
});

// Reset global discount
router.post("/discount/reset", async (req, res) => {
  try {
    console.log("Resetting global discount");

    // Clear all discounted products
    const deleteResult = await DiscountedProduct.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} discounted products`);

    // Set discount inactive
    await GlobalSettings.findOneAndUpdate(
      { key: "discountActive" },
      { key: "discountActive", value: false },
      { upsert: true, new: true }
    );
    console.log("Set discount active flag to false");

    // Remove discount percentage
    await GlobalSettings.findOneAndDelete({ key: "discountPercentage" });
    console.log("Removed discount percentage setting");

    res.json({
      success: true,
      message: "Global discount reset successfully",
    });
  } catch (error) {
    console.error("Error resetting global discount:", error);
    res.status(500).json({
      success: false,
      message: "Error resetting global discount",
      error: error.message,
    });
  }
});

// Get global discount status
router.get("/discount/status", async (req, res) => {
  try {
    // Check if discount is active
    const discountActive = await GlobalSettings.findOne({
      key: "discountActive",
    });
    const isActive = discountActive && discountActive.value === true;

    if (!isActive) {
      return res.json({
        success: true,
        data: {
          discountActive: false,
          discountPercentage: 0,
        },
      });
    }

    // Get discount percentage
    const discountPercentageDoc = await GlobalSettings.findOne({
      key: "discountPercentage",
    });
    const discountPercentage = discountPercentageDoc
      ? discountPercentageDoc.value
      : 0;

    // Get discounted products
    const discountedProducts = await DiscountedProduct.find();
    console.log(`Found ${discountedProducts.length} discounted products`);

    // Create a map of original product IDs to their discounted info
    const discountedInfo = {};
    discountedProducts.forEach((dp) => {
      discountedInfo[dp.originalProductId] = {
        originalPrice: dp.originalPrice,
        discountedPrice: dp.discountedPrice,
        discountPercentage: dp.discountPercentage,
      };
    });

    res.json({
      success: true,
      data: {
        discountActive: true,
        discountPercentage: discountPercentage,
        discountedProducts: discountedInfo,
        discountedProductsCount: discountedProducts.length,
      },
    });
  } catch (error) {
    console.error("Error getting discount status:", error);
    res.status(500).json({
      success: false,
      message: "Error getting discount status",
      error: error.message,
    });
  }
});

module.exports = router;
