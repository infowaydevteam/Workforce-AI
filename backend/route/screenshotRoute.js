const express = require("express");
const {
  uploadScreenshot,
  listScreenshotEmployees,
  listScreenshots,
  streamScreenshotImage,
} = require("../controller/screenshotController");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/upload", uploadScreenshot);

router.get(
  "/employees",
  verifyToken,
  authorizeRole("superadmin", "admin"),
  listScreenshotEmployees
);

router.get(
  "/",
  verifyToken,
  authorizeRole("superadmin", "admin"),
  listScreenshots
);

router.get(
  "/:id/image",
  verifyToken,
  authorizeRole("superadmin", "admin"),
  streamScreenshotImage
);

module.exports = router;
