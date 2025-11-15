const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const Reservation = require("../models/Reservation");
const {
  getReservations,
  getReservation,
  createReservation,
  updateReservation,
  deleteReservation,
  getAvailableTables,
} = require("../controllers/reservationController");

// Public routes
router.post("/", createReservation);
router.get("/available-tables", getAvailableTables);

// Cashier routes (no authentication required)
router.get("/cashier", getReservations);
router.get("/cashier/:id", getReservation);
router.put("/cashier/:id/:action", async (req, res) => {
  try {
    const { id, action } = req.params;

    // Validate action
    if (!["confirm", "complete", "cancel"].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "Invalid action. Must be 'confirm', 'complete', or 'cancel'.",
      });
    }

    // Prepare the update based on the action
    let update = {};
    if (action === "confirm") {
      update = { status: "confirmed" };
    } else if (action === "complete") {
      update = { status: "completed", completedAt: Date.now() };
    } else if (action === "cancel") {
      update = { status: "cancelled", cancelledAt: Date.now() };
    }

    // Update the reservation
    const reservation = await Reservation.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: "Reservation not found",
      });
    }

    res.status(200).json({
      success: true,
      data: reservation,
    });
  } catch (error) {
    console.error(`Error in cashier ${req.params.action} action:`, error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
});

// Protected routes for admin operations
router.get("/", protect, getReservations);
router.get("/:id", protect, getReservation);
router.put("/:id", protect, updateReservation);
router.delete("/:id", protect, deleteReservation);

// ID Verification route
router.put("/:id/verify-id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, idCardUrl } = req.body;

    // Validate status
    if (!["verified", "rejected", "pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status. Must be 'verified', 'rejected', or 'pending'.",
      });
    }

    // Find and update the reservation
    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: "Reservation not found",
      });
    }

    // Update ID verification status
    reservation.idVerification = {
      status,
      verifiedAt: status === "verified" ? Date.now() : null,
      rejectedAt: status === "rejected" ? Date.now() : null,
      verifiedBy: req.user._id,
      idCardUrl: idCardUrl || reservation.idVerification?.idCardUrl,
    };

    // Save the updated reservation
    await reservation.save();

    // Return success response
    res.status(200).json({
      success: true,
      data: reservation,
    });
  } catch (error) {
    console.error("Error verifying ID:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
});

module.exports = router;
