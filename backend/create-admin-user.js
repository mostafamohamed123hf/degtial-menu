const mongoose = require("mongoose");
const Customer = require("./models/Customer");
const readline = require("readline");

// Create interface for reading from command line
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Function to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function createAdminUser() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/digitalmenu",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("Connected to MongoDB");

    console.log("===== Admin User Creation =====");
    console.log("This script will create an admin user with full permissions");

    // Get admin details from user input
    const username = await prompt("Enter admin username: ");
    const email = await prompt("Enter admin email: ");
    const name = await prompt("Enter admin name: ");
    const password = await prompt("Enter admin password (min 8 characters): ");

    if (!username || !email || !password) {
      console.error("Error: All fields are required");
      process.exit(1);
    }

    if (password.length < 8) {
      console.error("Error: Password must be at least 8 characters");
      process.exit(1);
    }

    // First, check if the user already exists
    const existingUser = await Customer.findOne({
      $or: [{ email: email }, { username: username }],
    });

    if (existingUser) {
      console.log("User with this email or username already exists.");
      const updateConfirm = await prompt(
        "Do you want to update this user with admin permissions? (y/n): "
      );

      if (updateConfirm.toLowerCase() === "y") {
        // Update to give full admin permissions
        existingUser.permissions = {
          adminPanel: true,
          stats: true,
          productsView: true,
          productsEdit: true,
          vouchersView: true,
          vouchersEdit: true,
          tax: true,
          qr: true,
          reservations: true,
          loyaltyPoints: true,
          users: true,
          kitchen: true,
        };

        if (existingUser.email !== email) existingUser.email = email;
        if (existingUser.name !== name) existingUser.name = name;

        // Only update password if a new one is provided
        if (password) {
          existingUser.password = password;
        }

        await existingUser.save();
        console.log(
          "Updated existing user with admin permissions:",
          existingUser.email
        );
        console.log("User permissions:", existingUser.permissions);
      } else {
        console.log("Operation cancelled.");
      }
    } else {
      // Create new user with full admin permissions
      const adminUser = new Customer({
        name: name,
        username: username,
        email: email,
        password: password,
        permissions: {
          adminPanel: true,
          stats: true,
          productsView: true,
          productsEdit: true,
          vouchersView: true,
          vouchersEdit: true,
          tax: true,
          qr: true,
          reservations: true,
          loyaltyPoints: true,
          users: true,
          kitchen: true,
        },
        termsAccepted: true,
      });

      await adminUser.save();
      console.log("Created new admin user:", adminUser.email);
      console.log("User permissions:", adminUser.permissions);
    }

    // Verify admin users
    const adminUsers = await Customer.find({
      "permissions.adminPanel": true,
    }).select("email name username permissions");
    console.log("Users with admin panel permission:", adminUsers.length);

    console.log(
      "\nIMPORTANT: Make sure to set the following environment variables:"
    );
    console.log(`ADMIN_USERNAME=${username}`);
    console.log("ADMIN_PASSWORD=your-secure-password");
    console.log("\nThese will be used for the main admin login.");

    mongoose.disconnect();
    rl.close();
  } catch (error) {
    console.error("Error:", error);
    rl.close();
    process.exit(1);
  }
}

createAdminUser();
