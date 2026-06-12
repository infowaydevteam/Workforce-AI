const express = require("express");
const { getOrganizations, addOrganization, deleteOrganization } = require("../controller/organizationController");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const router = express.Router();


router.get(
  "/",
  verifyToken,
  authorizeRole("admin"),
  getOrganizations
);

router.post(
  "/",
  verifyToken,
  authorizeRole("admin"),
  addOrganization
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRole("admin"),
  deleteOrganization
);

module.exports = router;