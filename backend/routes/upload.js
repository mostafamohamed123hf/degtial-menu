const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const isVercel = !!process.env.VERCEL;

/**
 * @route POST /api/upload/image
 * @desc Upload an image (handles base64 data)
 * @access Public
 */
router.post("/image", (req, res) => {
  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: "No image data provided",
      });
    }

    // Check if the data is a valid base64 image
    if (!imageData.startsWith("data:image/")) {
      return res.status(400).json({
        success: false,
        message: "Invalid image format",
      });
    }

    // Validate base64 string length (max ~2MB after compression)
    // Base64 is ~33% larger than binary, so 2MB binary ≈ 2.7MB base64
    const maxBase64Length = 2.7 * 1024 * 1024; // ~2.7MB
    if (imageData.length > maxBase64Length) {
      return res.status(400).json({
        success: false,
        message: "Image data too large. Please compress the image before uploading.",
      });
    }

    // Resolve upload directory (use /tmp on Vercel)
    const uploadDir = isVercel
      ? path.join("/tmp", "assets", "products")
      : path.join(__dirname, "../../assets/products");
    if (!fs.existsSync(uploadDir)) {
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
      } catch (e) {
        // If directory creation fails on a read-only filesystem
        console.error("Failed to create upload directory:", e.message);
      }
    }

    // Extract image type and data
    const matches = imageData.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({
        success: false,
        message: "Invalid image data format",
      });
    }

    const imageType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    // Validate decoded buffer size (max 2MB)
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "Image file size exceeds 2MB limit. Please compress the image.",
      });
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const filename = `product_${timestamp}_${randomString}.${imageType}`;
    const filepath = path.join(uploadDir, filename);

    // Save the file
    try {
      fs.writeFileSync(filepath, buffer);
    } catch (writeErr) {
      console.error("File write error:", writeErr.message);
    }
    if (global.gridfsBucket) {
      const uploadStream = global.gridfsBucket.openUploadStream(filename, { contentType: `image/${imageType}` });
      uploadStream.end(buffer);
      uploadStream.on("finish", () => {
        const fileId = uploadStream.id.toString();
        const imageUrl = `/assets/products/${filename}`;
        return res.status(200).json({ success: true, imageUrl, fileId, downloadUrl: `/api/upload/file/${fileId}` });
      });
      uploadStream.on("error", () => {
        const imageUrl = isVercel
          ? `/api/upload/tmp/products/${filename}`
          : `/assets/products/${filename}`;
        return res.status(200).json({ success: true, imageUrl });
      });
      return;
    }

    console.log(`Image saved: ${filename}, size: ${(buffer.length / 1024).toFixed(2)} KB`);

    // Return the relative URL to the saved image
    const imageUrl = isVercel
      ? `/api/upload/tmp/products/${filename}`
      : `/assets/products/${filename}`;

    return res.status(200).json({ success: true, imageUrl: imageUrl });
  } catch (error) {
    console.error("Error uploading image:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during image upload",
    });
  }
});

/**
 * @route POST /api/upload/idcard
 * @desc Upload an ID card image (handles base64 data)
 * @access Public
 */
router.post("/idcard", (req, res) => {
  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: "No image data provided",
      });
    }

    // Check if the data is a valid base64 image
    if (!imageData.startsWith("data:image/")) {
      return res.status(400).json({
        success: false,
        message: "Invalid image format",
      });
    }

    // Validate base64 string length (max ~2MB after compression)
    const maxBase64Length = 2.7 * 1024 * 1024; // ~2.7MB
    if (imageData.length > maxBase64Length) {
      return res.status(400).json({
        success: false,
        message: "Image data too large. Please compress the image before uploading.",
      });
    }

    // Resolve upload directory (use /tmp on Vercel)
    const uploadDir = isVercel
      ? path.join("/tmp", "assets", "idcards")
      : path.join(__dirname, "../../assets/idcards");
    if (!fs.existsSync(uploadDir)) {
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
      } catch (e) {
        console.error("Failed to create idcards directory:", e.message);
      }
    }

    // Extract image type and data
    const matches = imageData.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({
        success: false,
        message: "Invalid image data format",
      });
    }

    const imageType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    // Validate decoded buffer size (max 2MB)
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "Image file size exceeds 2MB limit. Please compress the image.",
      });
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const filename = `idcard_${timestamp}_${randomString}.${imageType}`;
    const filepath = path.join(uploadDir, filename);

    // Save the file
    try {
      fs.writeFileSync(filepath, buffer);
    } catch (writeErr) {
      console.error("File write error (idcard):", writeErr.message);
    }
    if (global.gridfsBucket) {
      const uploadStream = global.gridfsBucket.openUploadStream(filename, { contentType: `image/${imageType}` });
      uploadStream.end(buffer);
      uploadStream.on("finish", () => {
        const fileId = uploadStream.id.toString();
        const imageUrl = `/assets/idcards/${filename}`;
        return res.status(200).json({ success: true, imageUrl, fileId, downloadUrl: `/api/upload/file/${fileId}` });
      });
      uploadStream.on("error", () => {
        const imageUrl = isVercel
          ? `/api/upload/tmp/idcards/${filename}`
          : `/assets/idcards/${filename}`;
        return res.status(200).json({ success: true, imageUrl });
      });
      return;
    }

    console.log(`ID card image saved: ${filename}, size: ${(buffer.length / 1024).toFixed(2)} KB`);

    // Return the relative URL to the saved image
    const imageUrl = isVercel
      ? `/api/upload/tmp/idcards/${filename}`
      : `/assets/idcards/${filename}`;

    return res.status(200).json({ success: true, imageUrl: imageUrl });
  } catch (error) {
    console.error("Error uploading ID card image:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during ID card image upload",
    });
  }
});

router.get("/file/:id", async (req, res) => {
  try {
    if (!global.gridfsBucket) {
      return res.status(500).json({ success: false, message: "Storage not available" });
    }
    const id = new mongoose.Types.ObjectId(req.params.id);
    const files = await global.gridfsBucket.find({ _id: id }).toArray();
    if (!files || !files.length) {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    const file = files[0];
    if (file.contentType) {
      res.set("Content-Type", file.contentType);
    }
    const downloadStream = global.gridfsBucket.openDownloadStream(id);
    downloadStream.on("error", () => {
      return res.status(500).json({ success: false, message: "Error reading file" });
    });
    downloadStream.pipe(res);
  } catch (e) {
    return res.status(400).json({ success: false, message: "Invalid file id" });
  }
});

// Serve files saved to /tmp on Vercel
router.get("/tmp/products/:filename", (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join("/tmp", "assets", "products", filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    const ext = path.extname(filename).replace(".", "") || "jpeg";
    res.set("Content-Type", `image/${ext}`);
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    return res.status(500).json({ success: false, message: "Error reading file" });
  }
});

router.get("/tmp/idcards/:filename", (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join("/tmp", "assets", "idcards", filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    const ext = path.extname(filename).replace(".", "") || "jpeg";
    res.set("Content-Type", `image/${ext}`);
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    return res.status(500).json({ success: false, message: "Error reading file" });
  }
});

module.exports = router;
