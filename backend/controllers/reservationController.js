const Reservation = require("../models/Reservation");

// Get all reservations
exports.getReservations = async (req, res) => {
  try {
    // Check if a date filter is provided
    const { date } = req.query;
    let query = {};

    if (date) {
      // Convert date string to Date object for the start of the day
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);

      // Create end date (start of next day)
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      // Filter reservations for the specified date
      query.date = {
        $gte: startDate,
        $lt: endDate,
      };

      console.log(`Filtering reservations for date: ${date}, query:`, query);
    }

    // Find reservations with optional date filter
    const reservations = await Reservation.find(query).sort({
      date: 1,
      time: 1,
    });

    res.status(200).json({
      success: true,
      count: reservations.length,
      data: reservations,
    });
  } catch (error) {
    console.error("Error fetching reservations:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// Get available tables for a specific date and time
exports.getAvailableTables = async (req, res) => {
  try {
    const { date, time } = req.query;

    // Validate required fields
    if (!date || !time) {
      return res.status(400).json({
        success: false,
        error: "Please provide date and time",
      });
    }

    // Convert date string to Date object
    const reservationDate = new Date(date);
    reservationDate.setHours(0, 0, 0, 0);

    // Find existing reservations for the given date and time
    const existingReservations = await Reservation.find({
      date: {
        $gte: reservationDate,
        $lt: new Date(reservationDate.getTime() + 24 * 60 * 60 * 1000),
      },
      time: time,
      status: { $nin: ["cancelled"] },
    });

    // Get the table numbers that are already reserved
    const reservedTables = existingReservations.map((r) => r.tableNumber);

    // Assuming we have tables numbered 1 to 20
    const allTables = Array.from({ length: 20 }, (_, i) => i + 1);

    // Filter out the reserved tables to get available tables
    const availableTables = allTables.filter(
      (table) => !reservedTables.includes(table)
    );

    res.status(200).json({
      success: true,
      count: availableTables.length,
      data: availableTables,
    });
  } catch (error) {
    console.error("Error fetching available tables:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// Get single reservation
exports.getReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

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
    console.error("Error fetching reservation:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// Create new reservation
exports.createReservation = async (req, res) => {
  try {
    // Extract reservation data from request body
    const { name, phone, guests, date, time, notes, idCardPhoto } = req.body;

    // Validate required fields
    if (!name || !phone || !guests || !date || !time) {
      return res.status(400).json({
        success: false,
        error: "Please provide all required fields",
      });
    }

    // Check if the phone number already has an active reservation
    const activeReservation = await Reservation.findOne({
      phone,
      status: { $in: ["pending", "confirmed"] },
    });

    if (activeReservation) {
      return res.status(400).json({
        success: false,
        error:
          "لديك حجز نشط بالفعل. لا يمكن إجراء أكثر من حجز واحد في نفس الوقت",
      });
    }

    // Create reservation
    const reservation = await Reservation.create({
      name,
      phone,
      guests: Number(guests),
      date: new Date(date),
      time,
      notes: notes || "",
      idCardPhoto: idCardPhoto || "",
    });

    res.status(201).json({
      success: true,
      data: reservation,
    });
  } catch (error) {
    console.error("Error creating reservation:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// Update reservation
exports.updateReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

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
    console.error("Error updating reservation:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// Delete reservation
exports.deleteReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndDelete(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: "Reservation not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error("Error deleting reservation:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};
