const express = require("express");
const { heartbeat } = require("../controller/heartbeatController");
const router = express.Router();


router.post("/", heartbeat);

module.exports = router;