const express = require("express");
const router = express.Router();
const {
  sendInvitation,
  getInvitations,
  validateInviteToken,
  acceptInvitation,
  deleteInvitation,
} = require("../controller/invitationController");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");

router.post("/", verifyToken, authorizeRole("admin", "hr"), sendInvitation);
router.get("/", verifyToken, authorizeRole("admin", "hr"), getInvitations);
router.get("/validate/:token", validateInviteToken);
router.post("/accept/:token", acceptInvitation);
router.delete("/:id", verifyToken, authorizeRole("admin", "hr"), deleteInvitation);

module.exports = router;
