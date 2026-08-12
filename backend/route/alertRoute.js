const express = require("express");

const router = express.Router();

const {
  sendRestrictedAlert,
} = require("../controller/alertController");

router.post("/send", sendRestrictedAlert);

module.exports = router;