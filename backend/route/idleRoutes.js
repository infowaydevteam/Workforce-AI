const express = require("express");
const { logIdle } = require("../controller/idleController");

const router = express.Router();

router.post("/log", logIdle);

module.exports = router;