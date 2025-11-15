const mongoose = require("mongoose");
const Product = require("../models/Product");
require("dotenv").config();

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
    name: "بيتزا مارجريتا",
    description:
      "بيتزا مارجريتا مع الجبن الموزاريلا وصلصة الطماطم، بيتزا ايطالية اصلية",
    price: 120.0,
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

// Function to fix the orderId index in orders collection
async function fixOrdersIndexes(db) {
  try {
    console.log("\n=== FIXING ORDERS INDEXES ===");
    // Print the current indexes
    console.log("Current indexes:");
    const currentIndexes = await db.collection("orders").indexes();
    console.log(JSON.stringify(currentIndexes, null, 2));

    // Check if the problematic index exists
    const indexExists = currentIndexes.some(
      (index) => index.name === "orderId_1"
    );

    if (indexExists) {
      // Drop the problematic orderId index
      console.log("\nDropping orderId index...");
      await db.collection("orders").dropIndex("orderId_1");
      console.log("Index dropped successfully");
    } else {
      console.log(
        "\nNo problematic orderId_1 index found. Skipping drop step."
      );
    }

    // Create a new sparse index for orderId
    console.log("\nCreating new sparse index for orderId...");
    await db
      .collection("orders")
      .createIndex(
        { orderId: 1 },
        { unique: true, sparse: true, background: true }
      );
    console.log("New index created successfully");

    // Print the updated indexes
    console.log("\nUpdated indexes:");
    const updatedIndexes = await db.collection("orders").indexes();
    console.log(JSON.stringify(updatedIndexes, null, 2));
    console.log("\n=== INDEX FIX COMPLETED ===");
  } catch (error) {
    console.error("Error fixing indexes:", error);
  }
}

async function initializeDatabase() {
  let connection;
  try {
    // Connect to MongoDB
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/digitalmenu";
    connection = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected...");

    // Check command line arguments
    const args = process.argv.slice(2);

    // If --fix-indexes flag is provided, only run the index fix
    if (args.includes("--fix-indexes")) {
      await fixOrdersIndexes(mongoose.connection.db);
      return;
    }

    // If --all flag is provided, run both initialization and index fix
    const runAll = args.includes("--all");

    // Clear existing products
    await Product.deleteMany({});
    console.log("Cleared existing products");

    // Insert default products
    await Product.insertMany(defaultProducts);
    console.log("Default products inserted successfully");

    // Fix indexes if --all flag is provided
    if (runAll) {
      await fixOrdersIndexes(mongoose.connection.db);
    }
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  } finally {
    // Close the connection
    if (connection) {
      await mongoose.connection.close();
      console.log("Database connection closed");
    }
    console.log("Database operations completed");
  }
}

initializeDatabase();
