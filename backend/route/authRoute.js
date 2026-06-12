const express = require("express");
const router = express.Router();

const { register, login } = require("../controller/authController");
const { companySignup } = require("../controller/tenantController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/company-signup", companySignup);

module.exports = router;
