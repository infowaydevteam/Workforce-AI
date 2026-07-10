const express = require("express");
const { getDashboardStats, getRecentActivities, getLiveUsers, getOrganizationSummary, getTopApplicationsToday } = require("../controller/dashboardcontroller");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const router = express.Router();

router.get(
  "/stats",
  verifyToken,
  authorizeRole("superadmin", "admin"),
  getDashboardStats
);

router.get(
  "/recent-activities",
  verifyToken,
  authorizeRole("superadmin", "admin"),
  getRecentActivities
);
router.get(
  "/live-users",
  verifyToken,
  authorizeRole("superadmin", "admin"),
  getLiveUsers
);

router.get(
  "/organization-summary",
    verifyToken,
  authorizeRole("superadmin", "admin"),
  getOrganizationSummary
);
router.get("/top-apps", 
    verifyToken,
  authorizeRole("superadmin", "admin"),
  getTopApplicationsToday
);

module.exports = router;