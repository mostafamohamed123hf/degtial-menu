const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  // Optional English name shown when language is English
  nameEn: {
    type: String,
    trim: true,
    default: "",
  },
  description: {
    type: String,
    required: true,
  },
  // Optional English description shown when language is English
  descriptionEn: {
    type: String,
    default: "",
  },
  price: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    default: 0,
  },
  totalRatings: {
    type: Number,
    default: 0,
  },
  addOns: {
    type: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },
        // Optional English title for the add-on section
        titleEn: {
          type: String,
          trim: true,
          default: "",
        },
        required: {
          type: Boolean,
          default: false,
        },
        singleChoice: {
          type: Boolean,
          default: false,
        },
        options: [
          {
            name: {
              type: String,
              required: true,
              trim: true,
            },
            // Optional English name for the option
            nameEn: {
              type: String,
              trim: true,
              default: "",
            },
            price: {
              type: Number,
              default: 0,
            },
          },
        ],
      },
    ],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes to improve query performance
ProductSchema.index({ category: 1 });
ProductSchema.index({ name: 1 });
ProductSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Product", ProductSchema);
