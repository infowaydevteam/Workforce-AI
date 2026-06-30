const express = require("express");
const { verifyAgent } = require("../controller/agentController");
const path = require("path");
const router = express.Router();
const fs = require("fs");


router.post("/verify", verifyAgent);

router.get("/download-agent/:token", async (req, res) => {
  try {
    const { token } = req.params;

    console.log("Agent Download Request:", token);

    const zipPath = path.resolve(
      __dirname,
      "..",
      "files",
      "IWF-Agent.zip"
    );

    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({
        success: false,
        message: "Agent package not found",
      });
    }

    return res.download(zipPath, "IWF-Agent.zip");
  } catch (err) {
    console.error("DOWNLOAD ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to download agent",
    });
  }
});

module.exports = router;