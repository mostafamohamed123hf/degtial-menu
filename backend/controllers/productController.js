const Product = require("../models/Product");
const fs = require("fs");
const path = require("path");

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);

    // Log the product creation to a file
    logProductChange("create", product);

    // Notify connected clients about the new product
    if (global.notifyClients) {
      global.notifyClients("product_created", { product });
    }

    res.status(201).json({
      success: true,
      data: product,
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

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findOne({ id: req.params.id });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Get the old product data for logging
    const oldProductData = {
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      description: product.description,
    };

    product = await Product.findOneAndUpdate({ id: req.params.id }, req.body, {
      new: true,
      runValidators: true,
    });

    // Log the product update to a file
    logProductChange("update", product, oldProductData);

    // Notify connected clients about the updated product
    if (global.notifyClients) {
      global.notifyClients("product_updated", {
        product,
        oldData: oldProductData,
      });
    }

    res.status(200).json({
      success: true,
      data: product,
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

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Log product deletion before actually deleting - wrapped in try-catch to handle file system errors
    try {
      logProductChange("delete", product);
    } catch (logError) {
      console.error("Error logging product deletion:", logError);
      // Continue with deletion even if logging fails
    }

    // Save product data for notification
    const deletedProduct = {
      id: product.id,
      name: product.name,
    };

    await Product.findOneAndDelete({ id: req.params.id });

    // Notify connected clients about the deleted product
    if (global.notifyClients) {
      global.notifyClients("product_deleted", { product: deletedProduct });
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// @desc    Create default products
// @route   POST /api/products/create-defaults
// @access  Private
exports.createDefaultProducts = async (req, res) => {
  try {
    // First, check if there are existing products
    const existingProducts = await Product.countDocuments();

    if (existingProducts > 0) {
      return res.status(400).json({
        success: false,
        message: "Default products already exist",
      });
    }

    // Default products from frontend
    const defaultProducts = [
      {
        id: "pizza1",
        name: "بيتزا بيروني غنائي",
        description:
          "بيتزا بيروني مع الجبن الموزاريلا وصلصة الطماطم، بيتزا ايطالية اصلية",
        price: 140.0,
        category: "pizza",
        image:
          "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80",
        rating: 4.8,
      },
      {
        id: "pizza2",
        name: "بيتزا بيروني غنائي",
        description:
          "بيتزا بيروني مع الجبن الموزاريلا وصلصة الطماطم، بيتزا ايطالية اصلية",
        price: 140.0,
        category: "pizza",
        image:
          "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
        rating: 4.8,
      },
      {
        id: "burger1",
        name: "برجر لحم أنغوس",
        description: "برجر لحم بقري أنغوس مع جبنة شيدر وصلصة خاصة",
        price: 120.0,
        category: "burger",
        image:
          "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=800&q=80",
        rating: 4.9,
      },
      {
        id: "burger2",
        name: "برجر دجاج مقرمش",
        description: "برجر دجاج مقرمش محمر مع صلصة الثوم والخس",
        price: 95.0,
        category: "burger",
        image:
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
        rating: 4.6,
      },
      {
        id: "sandwich1",
        name: "سندويتش شاورما",
        description: "شاورما دجاج مع صلصة طحينة وخضار منوعة",
        price: 65.0,
        category: "sandwich",
        image:
          "https://images.unsplash.com/photo-1485451456034-3f9391c6f769?auto=format&fit=crop&w=800&q=80",
        rating: 4.7,
      },
      {
        id: "drink1",
        name: "عصير فواكه طازج",
        description: "مزيج من الفواكه الطازجة المنعشة",
        price: 35.0,
        category: "drink",
        image:
          "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80",
        rating: 4.5,
      },
    ];

    // Create the products in the database
    await Product.insertMany(defaultProducts);

    // Log the creation of default products
    defaultProducts.forEach((product) => {
      logProductChange("create", product);
    });

    res.status(201).json({
      success: true,
      count: defaultProducts.length,
      message: "Default products created successfully",
      data: defaultProducts,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

/**
 * Log product changes to a file
 * @param {string} action - The action performed (create, update, delete)
 * @param {Object} product - The product data
 * @param {Object} oldData - The old product data (for updates)
 */
function logProductChange(action, product, oldData = null) {
  try {
    // Make sure fs and path are imported
    const fs = require("fs");
    const path = require("path");

    const logsDir = path.join(__dirname, "../logs");

    // Create logs directory if it doesn't exist
    try {
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
    } catch (dirError) {
      console.error("Error creating logs directory:", dirError);
      return; // Exit the function if we can't create the directory
    }

    const logFile = path.join(logsDir, "product-changes.log");
    const timestamp = new Date().toISOString();

    let logMessage = `[${timestamp}] ${action.toUpperCase()}: Product ${
      product.id
    } (${product.name})\n`;

    if (action === "update" && oldData) {
      logMessage += `  Previous: ${JSON.stringify(oldData)}\n`;
      logMessage += `  New: ${JSON.stringify(product)}\n`;

      // List of specific changes
      const changes = [];
      if (oldData.name !== product.name)
        changes.push(`Name: "${oldData.name}" -> "${product.name}"`);
      if (oldData.price !== product.price)
        changes.push(`Price: ${oldData.price} -> ${product.price}`);
      if (oldData.category !== product.category)
        changes.push(`Category: ${oldData.category} -> ${product.category}`);
      if (oldData.description !== product.description)
        changes.push(`Description updated`);

      if (changes.length > 0) {
        logMessage += `  Changes: ${changes.join(", ")}\n`;
      }
    } else {
      logMessage += `  Data: ${JSON.stringify(product)}\n`;
    }

    // Append to log file
    try {
      fs.appendFileSync(logFile, logMessage + "\n");
      console.log(`Product ${action} logged: ${product.id} (${product.name})`);
    } catch (writeError) {
      console.error("Error writing to log file:", writeError);
    }
  } catch (error) {
    console.error("Error logging product change:", error);
  }
}
