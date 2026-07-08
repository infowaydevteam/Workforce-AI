const express = require("express");
const {
  getOnboardingOptions,
  getOrganizationOnboarding,
  saveCompanyOnboarding,
} = require("../controller/onboardingController");
const { authorizeRole, verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/options",
  verifyToken,
  authorizeRole("admin", "hr"),
  getOnboardingOptions
);

router.get(
  "/:organizationId",
  verifyToken,
  authorizeRole("admin", "hr"),
  getOrganizationOnboarding
);

router.post(
  "/",
  verifyToken,
  authorizeRole("admin", "hr"),
  saveCompanyOnboarding
);

module.exports = router;
