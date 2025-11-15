const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const CustomerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please add your full name"],
    trim: true,
    maxlength: [50, "Name cannot be more than 50 characters"],
  },
  username: {
    type: String,
    required: [true, "Please add a username"],
    unique: true,
    trim: true,
    maxlength: [30, "Username cannot be more than 30 characters"],
    match: [
      /^[a-zA-Z0-9_\-.]+$/,
      "Username can only contain letters, numbers, and the characters _ - .",
    ],
  },
  email: {
    type: String,
    required: [true, "Please add an email"],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please add a valid email",
    ],
  },
  phone: {
    type: String,
    required: false,
    maxlength: [20, "Phone number cannot be longer than 20 characters"],
  },
  password: {
    type: String,
    required: [true, "Please add a password"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false,
  },
  address: {
    type: String,
    maxlength: [200, "Address cannot be more than 200 characters"],
  },
  profilePhoto: {
    type: String,
    default: "",
  },
  loyaltyPoints: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "suspended"],
    default: "active",
  },
  hasAdminAccess: {
    type: Boolean,
    default: false,
    select: false,
  },
  permissions: {
    adminPanel: {
      type: Boolean,
      default: false,
    },
    cashier: {
      type: Boolean,
      default: false,
    },
    stats: {
      type: Boolean,
      default: false,
    },
    productsView: {
      type: Boolean,
      default: false,
    },
    productsEdit: {
      type: Boolean,
      default: false,
    },
    vouchersView: {
      type: Boolean,
      default: false,
    },
    vouchersEdit: {
      type: Boolean,
      default: false,
    },
    reservations: {
      type: Boolean,
      default: false,
    },
    tax: {
      type: Boolean,
      default: false,
    },
    points: {
      type: Boolean,
      default: false,
    },
    accounts: {
      type: Boolean,
      default: false,
    },
    qr: {
      type: Boolean,
      default: false,
    },
  },
  orders: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
  ],
  lastLogin: {
    type: Date,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  termsAccepted: {
    type: Boolean,
    default: false,
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
    default: null,
  },
  roleIdString: {
    type: String,
    default: "role_user",
  },
  roleName: {
    type: String,
    default: "مستخدم",
  },
});

// Encrypt password using bcrypt
CustomerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

// Sign JWT and return
CustomerSchema.methods.getSignedJwtToken = function () {
  try {
    console.log(`Generating token for customer ID: ${this._id}`);

    // Get JWT config
    const secret = process.env.JWT_SECRET || "your_default_jwt_secret";
    const expiresIn = process.env.JWT_EXPIRE || "7d";

    console.log(
      `Using JWT settings: expiresIn=${expiresIn}, secret=${
        secret ? "exists" : "missing"
      }`
    );

    // Generate token with proper payload
    const payload = {
      id: this._id.toString(),
      role: "customer",
    };

    console.log(`JWT payload: ${JSON.stringify(payload)}`);

    const token = jwt.sign(payload, secret, {
      expiresIn: expiresIn,
    });

    // Verify token was created successfully
    if (!token || typeof token !== "string") {
      console.error("Error generating token - not a string");
      throw new Error("Token generation failed");
    }

    console.log(`JWT token generated successfully (length: ${token.length})`);

    return token;
  } catch (err) {
    console.error("JWT token generation error:", err);
    // Return null instead of throwing to avoid crashing the app
    // The calling code needs to handle this case
    return null;
  }
};

// Match user entered password to hashed password in database
CustomerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Customer", CustomerSchema);
