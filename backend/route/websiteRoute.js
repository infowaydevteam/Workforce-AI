const express = require("express");

const router = express.Router();

const {
    getTrackedWebsites
} = require("../controller/websiteController");

router.get("/", getTrackedWebsites);

module.exports = router;