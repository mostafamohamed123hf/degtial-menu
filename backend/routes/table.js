const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");

router.get("/qr-token", protect, authorize("admin"), (req, res) => {
  const table = (req.query.table || "").toString();
  if (!table) {
    return res.status(400).json({ success: false, message: "Missing table" });
  }
  const secret = process.env.JWT_SECRET || "your_default_jwt_secret";
  const exp = Math.floor((Date.now() + 365 * 24 * 60 * 60 * 1000) / 1000);
  const qid = jwt.sign({ type: "qr_code", tableNumber: table, exp }, secret);
  return res.status(200).json({ success: true, qid, tableNumber: table });
});

router.get("/session", (req, res) => {
  const table = (req.query.table || "").toString();
  const qid = (req.query.qid || "").toString();
  if (!table) {
    return res.status(400).json({ success: false, message: "Missing table" });
  }
  if (!qid) {
    return res.status(403).json({ success: false, message: "QR validation required" });
  }
  try {
    const secret = process.env.JWT_SECRET || "your_default_jwt_secret";
    const decoded = jwt.verify(qid, secret);
    if (!decoded || decoded.type !== "qr_code") {
      return res.status(403).json({ success: false, message: "Invalid QR token" });
    }
    if (decoded.tableNumber !== table) {
      return res.status(403).json({ success: false, message: "QR table mismatch" });
    }
    const expiresInMs = 20 * 60 * 1000;
    const now = Date.now();
    const exp = Math.floor((now + expiresInMs) / 1000);
    const token = jwt.sign({ type: "order_session", tableNumber: table, exp }, secret);
    return res.status(200).json({ success: true, token, expiresAt: new Date(now + expiresInMs).toISOString(), tableNumber: table });
  } catch (e) {
    return res.status(403).json({ success: false, message: "Invalid or expired QR token" });
  }
});

module.exports = router;