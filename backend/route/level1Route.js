const express = require("express");
const {
  addDepartment,
  assignManager,
  createReview,
  deleteDepartment,
  getDepartments,
  getExecutiveAnalytics,
  getLevel1Status,
  inviteEmployee,
  markAgentInstalled,
  seedLevel1Demo,
  signupCompany,
} = require("../controller/level1Controller");
const { authorizeRole, verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/company-signup", signupCompany);

router.get(
  "/status",
  verifyToken,
  authorizeRole("admin", "manager", "hr", "executive"),
  getLevel1Status
);

router.post(
  "/demo-seed",
  verifyToken,
  authorizeRole("admin"),
  seedLevel1Demo
);

router.get(
  "/departments",
  verifyToken,
  authorizeRole("admin", "manager", "hr", "executive"),
  getDepartments
);

router.post(
  "/departments",
  verifyToken,
  authorizeRole("admin", "hr"),
  addDepartment
);

router.delete(
  "/departments/:id",
  verifyToken,
  authorizeRole("admin", "hr"),
  deleteDepartment
);

router.post(
  "/invite-employee",
  verifyToken,
  authorizeRole("admin", "hr", "manager"),
  inviteEmployee
);

router.post(
  "/assign-manager",
  verifyToken,
  authorizeRole("admin", "hr"),
  assignManager
);

router.post("/agent-installed", markAgentInstalled);

router.post(
  "/reviews",
  verifyToken,
  authorizeRole("admin", "manager", "hr"),
  createReview
);

router.get(
  "/executive-analytics",
  verifyToken,
  authorizeRole("admin", "executive", "hr"),
  getExecutiveAnalytics
);

module.exports = router;
