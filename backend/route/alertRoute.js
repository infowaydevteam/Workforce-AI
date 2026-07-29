const express = require("express");

const router = express.Router();

const {
  sendRestrictedAlert,
  sendIdleAlert,
} = require("../controller/alertController");

router.post("/send", sendRestrictedAlert);
router.post(
    "/idle",
    sendIdleAlert
);

module.exports = router;