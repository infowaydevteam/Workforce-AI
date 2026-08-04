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

// ── macOS download — choose architecture and inject activation config ─────
router.get("/download-mac/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const arch = req.query.arch === "x64" ? "x64" : "arm64";

    console.log("Mac Agent Download Request:", token, arch);

    const packageName = `IWF-Agent-mac-${arch}.zip`;
    let zipPath = path.resolve(__dirname, "..", "files", packageName);

    // Backward-compatible fallback for the original Apple Silicon package.
    if (!fs.existsSync(zipPath) && arch === "arm64") {
      zipPath = path.resolve(__dirname, "..", "files", "IWF-Agent-mac.zip");
    }
    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({
        success: false,
        message: `Mac ${arch} agent package not found`,
      });
    }

    const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT}`;
    const zip = new AdmZip(zipPath);
    const config = {
      agent_token: token,
      api_base_url: apiBaseUrl,
    };

    zip.updateFile("mac/config.json", Buffer.from(JSON.stringify(config, null, 2)));

    const tmpPath = path.join(
      os.tmpdir(),
      `IWF-Agent-mac-${arch}-${token.slice(0, 8)}.zip`
    );
    zip.writeZip(tmpPath);

    res.download(tmpPath, packageName, (err) => {
      fs.unlink(tmpPath, () => {});
      if (err) console.error("Download error:", err.message);
    });

  } catch (err) {
    console.error("MAC DOWNLOAD ERROR:", err);
    return res.status(500).json({ success: false, message: "Failed to download mac agent" });
  }
});

module.exports = router;
