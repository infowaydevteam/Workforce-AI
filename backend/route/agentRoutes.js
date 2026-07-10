const express = require("express");
const { verifyAgent } = require("../controller/agentController");
const path = require("path");
const router = express.Router();
const fs = require("fs");
const os = require("os");
const AdmZip = require("adm-zip");

router.post("/verify", verifyAgent);

// ── Legacy Windows zip download ───────────────────────────────────────────
router.get("/download-agent/:token", async (req, res) => {
  try {
    const zipPath = path.resolve(__dirname, "..", "files", "IWF-Agent.zip");

    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({ success: false, message: "Agent package not found" });
    }

    return res.download(zipPath, "IWF-Agent.zip");
  } catch (err) {
    console.error("DOWNLOAD ERROR:", err);
    return res.status(500).json({ success: false, message: "Failed to download agent" });
  }
});

// ── macOS DMG download — injects agent_token + api_base_url into config ──
router.get("/download-mac/:token", async (req, res) => {
  try {
    const { token } = req.params;

    console.log("Mac Agent Download Request:", token);

    const dmgPath = path.resolve(__dirname, "..", "files", "IWF-Agent-mac.dmg");
    const zipPath = path.resolve(__dirname, "..", "files", "IWF-Agent-mac.zip");

    // Prefer the DMG; fall back to zip if DMG not yet built
    if (fs.existsSync(dmgPath)) {
      return res.download(dmgPath, "IWF-Agent-mac.dmg");
    }

    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({ success: false, message: "Mac agent package not found" });
    }

    // Inject the token and server URL into config.json inside the zip
    // so the employee doesn't have to type the server address manually.
    const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT}`;

    const zip = new AdmZip(zipPath);

    const config = {
      agent_token: token,
      api_base_url: apiBaseUrl,
    };

    // Replace config.json in the zip (path inside zip: mac/config.json)
    zip.updateFile("mac/config.json", Buffer.from(JSON.stringify(config, null, 2)));

    const tmpPath = path.join(os.tmpdir(), `IWF-Agent-mac-${token.slice(0, 8)}.zip`);
    zip.writeZip(tmpPath);

    res.download(tmpPath, "IWF-Agent-mac.zip", (err) => {
      fs.unlink(tmpPath, () => {}); // clean up temp file after send
      if (err) console.error("Download error:", err.message);
    });

  } catch (err) {
    console.error("MAC DOWNLOAD ERROR:", err);
    return res.status(500).json({ success: false, message: "Failed to download mac agent" });
  }
});

module.exports = router;
