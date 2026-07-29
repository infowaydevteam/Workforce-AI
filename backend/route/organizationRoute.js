const express = require("express");
const { getOrganizations, addOrganization, deleteOrganization } = require("../controller/organizationController");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const router = express.Router();


router.get(
  "/",
  verifyToken,
  authorizeRole("superadmin","admin"),
  getOrganizations
);

router.post(
  "/",
  verifyToken,
  authorizeRole("superadmin","admin"),
  addOrganization
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRole("superadmin","admin"),
  deleteOrganization
);

module.exports = router;