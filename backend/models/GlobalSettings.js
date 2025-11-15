const mongoose = require("mongoose");

const GlobalSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field on save
GlobalSettingsSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Update the updatedAt field on update
GlobalSettingsSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model("GlobalSettings", GlobalSettingsSchema);
