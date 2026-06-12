const express = require("express");
const { getUsers, deleteUser, updateStatus, getEmployeeById, getLoginHistory, getAppUsage, getActivitySummary, getActivityLogs, getUserFullReport } = require("../controller/userController");
const { authorizeRole, verifyToken } = require("../middleware/authMiddleware");
const router = express.Router();

router.get(
  "/",
  verifyToken,
  authorizeRole("admin"),
  getUsers
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRole("admin"),
  deleteUser
);

router.post("/status", updateStatus);


router.get("/:id", getEmployeeById);

router.get("/:id/login-history", getLoginHistory);
router.get("/:id/app-usage", getAppUsage);
router.get("/:id/summary", getActivitySummary);
router.get("/:id/activity-logs", getActivityLogs);
router.get("/reports/:id",getUserFullReport);


module.exports = router;