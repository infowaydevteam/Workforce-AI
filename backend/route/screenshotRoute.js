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
  authorizeRole("superadmin", "admin", "hr"),
  listScreenshotEmployees
);

router.get(
  "/",
  verifyToken,
  authorizeRole("superadmin", "admin", "hr"),
  listScreenshots
);

router.get(
  "/:id/image",
  verifyToken,
  authorizeRole("superadmin", "admin", "hr"),
  streamScreenshotImage
);

module.exports = router;
