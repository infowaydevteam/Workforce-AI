const express = require("express");
const router = express.Router();
const { companySignup, getTenant } = require("../controller/tenantController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/signup", companySignup);
router.get("/me", verifyToken, getTenant);

module.exports = router;
