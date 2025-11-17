const express = require("express");
const router = express.Router();
const Category = require("../models/Category");

// Get all categories
router.get("/", async (req, res) => {
  try {
    console.log("GET /api/categories - Fetching categories from database...");

    // Sort by sortOrder first, then by name as secondary sort
    const categories = await Category.find().sort({ sortOrder: 1, name: 1 });

    console.log(`Found ${categories.length} categories`);

    res.json({
      success: true,
      data: categories,
      message: "Categories retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching categories",
      error: error.message,
    });
  }
});

// Get category by ID
router.get("/:id", async (req, res) => {
  try {
    console.log(`Fetching category with ID: ${req.params.id}`);

    // Try to find by the custom ID field
    let category = await Category.findOne({ id: req.params.id });

    // If not found, try with MongoDB's _id as fallback
    if (!category) {
      try {
        category = await Category.findById(req.params.id);
      } catch (error) {
        console.log("Invalid MongoDB ID format, skipping _id lookup");
      }
    }

    if (!category) {
      console.log(`Category with ID ${req.params.id} not found`);
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({
      success: true,
      data: category,
      message: "Category retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching category",
      error: error.message,
    });
  }
});

// Create new category
router.post("/", async (req, res) => {
  try {
    console.log("POST /api/categories - Creating new category:", req.body);

    // Check if category with same ID or value already exists
    const existingCategory = await Category.findOne({
      $or: [{ id: req.body.id }, { value: req.body.value }],
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this ID or value already exists",
      });
    }

    const category = new Category(req.body);
    await category.save();

    console.log("Category created successfully:", category);

    // Notify connected clients about the new category
    if (global.notifyClients) {
      global.notifyClients("category_added", {
        category: category,
      });
    }

    res.status(201).json({
      success: true,
      data: category,
      message: "Category created successfully",
    });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(400).json({
      success: false,
      message: "Error creating category",
      error: error.message,
    });
  }
});

// Update category
router.put("/:id", async (req, res) => {
  try {
    console.log(`Updating category with ID: ${req.params.id}`, req.body);

    // First try to find by the custom ID field
    let category = await Category.findOne({ id: req.params.id });

    // If not found, try with MongoDB's _id as fallback
    if (!category) {
      category = await Category.findById(req.params.id);
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Update the category with the new data
    Object.assign(category, req.body);
    await category.save();

    console.log("Category updated successfully:", category);

    // Notify connected clients about the updated category
    if (global.notifyClients) {
      global.notifyClients("category_updated", {
        category: category,
      });
    }

    res.json({
      success: true,
      data: category,
      message: "Category updated successfully",
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(400).json({
      success: false,
      message: "Error updating category",
      error: error.message,
    });
  }
});

// Delete category
router.delete("/:id", async (req, res) => {
  try {
    console.log(`Deleting category with ID: ${req.params.id}`);

    // First try to find by the custom ID field
    let category = await Category.findOne({ id: req.params.id });

    // If not found, try with MongoDB's _id as fallback
    if (!category) {
      category = await Category.findById(req.params.id);
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if any products are using this category
    const Product = require("../models/Product");
    const productsUsingCategory = await Product.countDocuments({
      category: category.value,
    });

    if (productsUsingCategory > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. ${productsUsingCategory} product(s) are using this category.`,
      });
    }

    // Delete the category
    await category.deleteOne();

    console.log("Category deleted successfully");

    // Notify connected clients about the deleted category
    if (global.notifyClients) {
      global.notifyClients("category_deleted", {
        categoryId: req.params.id,
      });
    }

    res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting category",
      error: error.message,
    });
  }
});

module.exports = router;
