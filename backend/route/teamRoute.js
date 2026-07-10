const express = require("express");
const { getTeams, addTeam, deleteTeam } = require("../controller/teamController");
const { authorizeRole, verifyToken } = require("../middleware/authMiddleware");
const router = express.Router();

router.get(
  "/",
  verifyToken,
  authorizeRole("superadmin", "admin"),
  getTeams
);

// Add Team
router.post(
  "/",
  verifyToken,
  authorizeRole("superadmin","admin"),
  addTeam
);

// Delete Team
router.delete(
  "/:id",
  verifyToken,
  authorizeRole("superadmin","admin"),
  deleteTeam
);

module.exports = router;