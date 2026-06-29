const express = require("express");
const { getRestrictedItems } = require("../controller/restrictedController");

const router = express.Router();

router.get("/", getRestrictedItems);

module.exports = router;