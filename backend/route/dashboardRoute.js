const express = require("express");
const { getDashboardStats, getRecentActivities, getLiveUsers, getOrganizationSummary, getTopApplicationsToday } = require("../controller/dashboardcontroller");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const router = express.Router();

router.get(
  "/stats",
  verifyToken,
  authorizeRole("admin"),
  getDashboardStats
);

router.get(
  "/recent-activities",
  getRecentActivities
);
router.get(
  "/live-users",
  getLiveUsers
);

router.get(
  "/organization-summary",
  getOrganizationSummary
);
router.get("/top-apps", getTopApplicationsToday);

module.exports = router;