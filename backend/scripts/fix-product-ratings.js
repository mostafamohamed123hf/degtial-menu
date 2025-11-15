/**
 * Script to recalculate and fix product ratings based on actual Rating documents in the database
 * This fixes products that have incorrect ratings due to previous bugs where ratings were saved
 * but the product's rating field was not updated correctly
 */

const mongoose = require("mongoose");
const Product = require("../models/Product");
const Rating = require("../models/Rating");

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/digital-menu";

async function fixProductRatings() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully");

    // Get all products
    const products = await Product.find();
    console.log(`\nFound ${products.length} products to check\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const product of products) {
      // Get all ratings for this product using both custom id and MongoDB _id
      const ratingsById = await Rating.find({ productId: product.id });
      const ratingsByMongoId = await Rating.find({ productId: product._id.toString() });
      
      // Combine and deduplicate ratings
      const allRatingsMap = new Map();
      [...ratingsById, ...ratingsByMongoId].forEach(rating => {
        allRatingsMap.set(rating._id.toString(), rating);
      });
      const allRatings = Array.from(allRatingsMap.values());

      const actualTotalRatings = allRatings.length;
      
      if (actualTotalRatings === 0) {
        // No ratings for this product, ensure it has rating: 0, totalRatings: 0
        if (product.rating !== 0 || product.totalRatings !== 0) {
          await Product.findByIdAndUpdate(product._id, {
            rating: 0,
            totalRatings: 0,
          });
          console.log(`✓ Fixed ${product.name} (${product.id}): Reset to 0 (no ratings)`);
          fixedCount++;
        } else {
          skippedCount++;
        }
        continue;
      }

      // Calculate the correct average rating
      const sumOfRatings = allRatings.reduce((sum, r) => sum + r.rating, 0);
      const correctAverageRating = parseFloat((sumOfRatings / actualTotalRatings).toFixed(1));

      // Check if the product's rating needs to be updated
      if (
        product.rating !== correctAverageRating ||
        product.totalRatings !== actualTotalRatings
      ) {
        console.log(`\nFixing product: ${product.name} (${product.id})`);
        console.log(`  Current: rating=${product.rating}, totalRatings=${product.totalRatings}`);
        console.log(`  Correct: rating=${correctAverageRating}, totalRatings=${actualTotalRatings}`);
        console.log(`  Rating values: [${allRatings.map(r => r.rating).join(", ")}]`);

        await Product.findByIdAndUpdate(product._id, {
          rating: correctAverageRating,
          totalRatings: actualTotalRatings,
        });

        console.log(`  ✓ Updated successfully`);
        fixedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("Summary:");
    console.log(`  Total products checked: ${products.length}`);
    console.log(`  Products fixed: ${fixedCount}`);
    console.log(`  Products already correct: ${skippedCount}`);
    console.log("=".repeat(60) + "\n");

    console.log("✓ Product ratings fixed successfully!");
  } catch (error) {
    console.error("Error fixing product ratings:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
    process.exit(0);
  }
}

// Run the script
fixProductRatings();
