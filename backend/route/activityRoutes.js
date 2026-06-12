const express = require("express");
const {logActivity,getActivity} = require("../controller/activityController");

const router = express.Router();

router.post("/log", logActivity);
router.get("/:userId", getActivity);

module.exports = router;