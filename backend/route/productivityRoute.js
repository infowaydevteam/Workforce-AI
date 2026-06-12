const express = require("express");
const router = express.Router();
const {
  getUserProductivity,
  getTeamProductivity,
  getExecutiveAnalytics,
  getManagerTeamProductivity,
} = require("../controller/productivityController");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");

router.get("/user/:userId", verifyToken, getUserProductivity);
router.get("/team", verifyToken, authorizeRole("admin", "hr", "executive"), getTeamProductivity);
router.get("/executive", verifyToken, authorizeRole("admin", "executive"), getExecutiveAnalytics);
router.get("/my-team", verifyToken, authorizeRole("admin", "manager"), getManagerTeamProductivity);

module.exports = router;
