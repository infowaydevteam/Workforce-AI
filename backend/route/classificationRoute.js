const express = require("express");
const router = express.Router();
const {
  getClassifications,
  upsertClassification,
  deleteClassification,
  autoClassifyUnknown,
} = require("../controller/classificationController");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getClassifications);
router.post("/", verifyToken, authorizeRole("admin"), upsertClassification);
router.post("/auto", verifyToken, authorizeRole("admin"), autoClassifyUnknown);
router.delete("/:id", verifyToken, authorizeRole("admin"), deleteClassification);

module.exports = router;
