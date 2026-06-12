const express = require("express");
const { startSession, endSession } = require("../controller/sessionController");


const router = express.Router();

router.post("/start", startSession);
router.post("/end", endSession);

module.exports = router;