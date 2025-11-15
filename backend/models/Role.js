const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    nameEn: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    color: {
      type: String,
      required: false,
      default: "#6c757d",
      validate: {
        validator: function(v) {
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: 'Color must be a valid hex color code'
      }
    },
    icon: {
      type: String,
      required: false,
      default: "fas fa-user",
      trim: true,
    },
    permissions: {
      adminPanel: { type: Boolean, default: false },
      cashier: { type: Boolean, default: false },
      stats: { type: Boolean, default: false },
      productsView: { type: Boolean, default: false },
      productsEdit: { type: Boolean, default: false },
      vouchersView: { type: Boolean, default: false },
      vouchersEdit: { type: Boolean, default: false },
      reservations: { type: Boolean, default: false },
      tax: { type: Boolean, default: false },
      points: { type: Boolean, default: false },
      accounts: { type: Boolean, default: false },
      qr: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Role", roleSchema);
