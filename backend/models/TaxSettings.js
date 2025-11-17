const mongoose = require("mongoose");

const TaxSettingsSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    rate: {
      type: Number,
      default: 0,
    },
    serviceEnabled: {
      type: Boolean,
      default: false,
    },
    serviceRate: {
      type: Number,
      default: 0,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TaxSettings", TaxSettingsSchema);
