const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();
const http = require("http");
const WebSocket = require("ws");
const errorHandler = require("./middleware/error");
const { apiLimiter } = require("./middleware/rateLimiter");
const csrfProtection = require("./middleware/csrf");

// Import routes
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const categoryRoutes = require("./routes/categories");
const voucherRoutes = require("./routes/vouchers");
const offerRoutes = require("./routes/offers");
const taxSettingsRoutes = require("./routes/taxSettings");
const reservationRoutes = require("./routes/reservations");
const customerRoutes = require("./routes/customer");
const orderRoutes = require("./routes/orders");
const ratingRoutes = require("./routes/ratingRoutes");
const uploadRoutes = require("./routes/upload");
const roleRoutes = require("./routes/roles");
const adminPointsRoutes = require("./routes/admin-points");
const globalSettingsRoutes = require("./routes/globalSettings");

// Initialize express app
const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

// WebSocket connection handler
wss.on("connection", (ws, req) => {
  const clientIp = req.socket.remoteAddress || "unknown";
  console.log(`Client connected from ${clientIp}`);

  // Generate a unique socketId and store it on the ws object
  const socketId = ws._socket.remoteAddress + ":" + ws._socket.remotePort;
  ws.socketId = socketId;

  clients.add(ws);
});

// Make WebSocket server available globally with improved error handling
global.notifyClients = (type, data) => {
  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
  });

  let activeClients = 0;

  // If a specific socketId is provided, only send to that client
  if (data && data.socketId) {
    const targetSocketId = data.socketId;
    let targetFound = false;

    clients.forEach((client) => {
      // Check if this client has the matching socketId
      if (
        client.socketId === targetSocketId &&
        client.readyState === WebSocket.OPEN
      ) {
        try {
          client.send(message);
          activeClients++;
          targetFound = true;
        } catch (error) {
          console.error(
            "Error sending notification to specific client:",
            error
          );
          clients.delete(client);
        }
      }
    });

    if (!targetFound) {
      console.warn(
        `Target client with socketId ${targetSocketId} not found or not connected`
      );
    }

    console.log(`Notified ${activeClients} specific client about ${type}`);
    return;
  }

  // Otherwise broadcast to all clients
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        activeClients++;
      } catch (error) {
        console.error("Error sending notification to client:", error);
        // Remove problematic client
        clients.delete(client);
      }
    } else if (
      client.readyState === WebSocket.CLOSED ||
      client.readyState === WebSocket.CLOSING
    ) {
      // Clean up closed connections
      clients.delete(client);
    }
  });

  console.log(`Notified ${activeClients} clients about ${type}`);
};

// Security middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: (function () {
          const src = ["'self'", "'unsafe-inline'", "https://unpkg.com"];
          if (process.env.NODE_ENV === "development") {
            src.push("'unsafe-eval'");
          }
          return src;
        })(),
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://unpkg.com",
          "https://fonts.googleapis.com",
          "https://site-assets.fontawesome.com",
        ],
        styleSrcElem: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://unpkg.com",
          "https://fonts.googleapis.com",
          "https://site-assets.fontawesome.com",
        ],
        imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
        connectSrc: [
          "'self'",
          "http://localhost:5000",
          "ws://localhost:5000",
          "https://unpkg.com",
        ],
        fontSrc: [
          "'self'",
          "data:",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
          "https://site-assets.fontawesome.com",
        ],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  })
);

// Configure CORS with specific options
app.use(
  cors({
    origin: [
      "http://127.0.0.1:5500",
      "http://localhost:5500",
      "http://localhost:5000",
      "http://127.0.0.1:5000",
      "http://localhost", // For local file access
      "null", // For file:// protocol
      "*", // Allow all origins for development
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
      "Accept",
      "Origin",
      "Cache-Control",
    ],
    credentials: true,
    exposedHeaders: ["Set-Cookie"],
    maxAge: 86400, // Cache preflight requests for 24 hours
  })
);

// Rate limiting - now using our custom middleware
app.use("/api/", apiLimiter);

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Parse JSON request body with increased limit for base64 images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check endpoint (public, no authentication required)
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    time: new Date().toISOString(),
  });
});

// Apply CSRF protection to all API routes except GET requests
app.use("/api", (req, res, next) => {
  // Skip CSRF for GET requests and the admin login endpoint
  if (
    req.method === "GET" ||
    (req.path === "/auth/admin/login" && req.method === "POST")
  ) {
    next();
  } else {
    csrfProtection(req, res, next);
  }
});

// Emergency direct route for most-ordered-products to fix 404 issue
app.get("/api/orders/most-ordered-products", async (req, res) => {
  console.log(
    "[DEBUG] Emergency direct route for most-ordered-products accessed"
  );
  try {
    // Get the Order model
    const Order = require("./models/Order");

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
          image: 1,
          totalOrdered: 1,
          averagePrice: { $round: ["$averagePrice", 2] },
        },
      },
    ]);

    console.log(
      `[DEBUG] Found ${mostOrderedProducts.length} most ordered products via emergency route`
    );

    res.status(200).json({
      success: true,
      count: mostOrderedProducts.length,
      data: mostOrderedProducts,
    });
  } catch (error) {
    console.error("Error in emergency route:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving most ordered products",
      error: error.message,
    });
  }
});

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/tax-settings", taxSettingsRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/admin/points", adminPointsRoutes);
app.use("/api/global-settings", globalSettingsRoutes);

// Debug route to list all registered routes
app.get("/api/debug/routes", (req, res) => {
  const routes = [];

  // Helper function to get routes from a given router
  function extractRoutes(router, basePath = "") {
    if (!router.stack) return;

    router.stack.forEach((layer) => {
      if (layer.route) {
        // Routes registered directly on the app
        const path = basePath + layer.route.path;
        const methods = Object.keys(layer.route.methods).map((method) =>
          method.toUpperCase()
        );
        routes.push({ path, methods });
      } else if (layer.name === "router" && layer.handle.stack) {
        // Mounted routers
        const mountPath = layer.regexp.toString().match(/^\/\^(\\\/[^\\]+)/)
          ? layer.regexp
              .toString()
              .match(/^\/\^(\\\/[^\\]+)/)[1]
              .replace(/\\\//g, "/")
          : "";
        extractRoutes(layer.handle, basePath + mountPath);
      }
    });
  }

  // Extract routes from the main app
  extractRoutes(app);

  res.json({
    count: routes.length,
    routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
  });
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "../public")));

// Explicitly serve assets folder for uploaded images
app.use('/assets', express.static(path.join(__dirname, "../assets")));

// Add a specific route for /register to redirect to register.html
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/register.html"));
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/pages/index.html"));
});

// In production, serve any unknown route from index.html
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/pages/index.html"));
  });
}

// Error handling middleware (after all route definitions)
app.use(errorHandler);

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Using a default connection string if environment variable is not set
    const mongoURI =
      process.env.MONGODB_URI || "mongodb+srv://mostafaerrors_db_user:6T8SwTXyF4APgHLy@cluster0.6im1iij.mongodb.net/";

    console.log("Attempting to connect to MongoDB at:", mongoURI);

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("MongoDB Connected Successfully!");
    global.gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "uploads" });

    // Create default categories if none exist
    const Category = require("./models/Category");
    const categoriesExist = await Category.countDocuments();
    console.log("Current number of categories in database:", categoriesExist);

    if (!categoriesExist) {
      console.log("Creating default categories...");
      const defaultCategories = [
        {
          id: "pizza",
          name: "بيتزا",
          nameEn: "Pizza",
          value: "pizza",
          icon: "fas fa-pizza-slice",
        },
        {
          id: "burger",
          name: "برجر",
          nameEn: "Burger",
          value: "burger",
          icon: "fas fa-hamburger",
        },
        {
          id: "sandwich",
          name: "سندويتش",
          nameEn: "Sandwich",
          value: "sandwich",
          icon: "fas fa-bread-slice",
        },
        {
          id: "drink",
          name: "مشروبات",
          nameEn: "Drinks",
          value: "drink",
          icon: "fas fa-glass-whiskey",
        },
      ];
      await Category.insertMany(defaultCategories);
      console.log("Default categories created successfully");
    } else {
      console.log("Categories already exist in database");
    }

    // Create default products if none exist
    const Product = require("./models/Product");
    const productsExist = await Product.countDocuments();
    console.log("Current number of products in database:", productsExist);

    // Creating default roles if none exist
    const Role = require("./models/Role");
    const rolesExist = await Role.countDocuments();
    console.log("Current number of roles in database:", rolesExist);

    if (!rolesExist) {
      console.log("Creating default roles...");
      const defaultRoles = [
        {
          name: "مدير",
          nameEn: "Administrator",
          permissions: {
            adminPanel: true,
            cashier: true,
            stats: true,
            productsView: true,
            productsEdit: true,
            vouchersView: true,
            vouchersEdit: true,
            reservations: true,
            tax: true,
            points: true,
            accounts: true,
            qr: true,
          },
        },
        {
          name: "كاشير",
          nameEn: "Cashier",
          permissions: {
            adminPanel: false,
            cashier: true,
            stats: false,
            productsView: true,
            productsEdit: false,
            vouchersView: true,
            vouchersEdit: false,
            reservations: false,
            tax: false,
            points: false,
            accounts: false,
            qr: false,
          },
        },
        {
          name: "مستخدم",
          nameEn: "User",
          permissions: {
            adminPanel: false,
            cashier: false,
            stats: false,
            productsView: false,
            productsEdit: false,
            vouchersView: false,
            vouchersEdit: false,
            reservations: false,
            tax: false,
            points: false,
            accounts: false,
            qr: false,
          },
        },
      ];
      await Role.insertMany(defaultRoles);
      console.log("Default roles created successfully");
    } else {
      console.log("Roles already exist in database");
    }

    if (!productsExist) {
      console.log("Creating default products...");
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
      await Product.insertMany(defaultProducts);
      console.log("Default products created successfully");
    } else {
      console.log("Products already exist in database");
    }
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    // Exit process with failure
    process.exit(1);
  }
};

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;
if (process.env.VERCEL) {
  module.exports = app;
} else {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
