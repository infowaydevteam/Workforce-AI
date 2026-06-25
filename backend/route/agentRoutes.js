const express = require("express");
const { verifyAgent } = require("../controller/agentController");
const path = require("path");
const router = express.Router();
const fs = require("fs");


router.post("/verify", verifyAgent);

// router.get("/download-agent/:token", async (req, res) => {
//   try {
//     console.log("STEP 1");

//     const { token } = req.params;
//     console.log("TOKEN:", token);

//     const configPath = path.resolve(__dirname, "..", "files",  "IWF-Agent", "config.json");
//     console.log("CONFIG PATH:", configPath);

//     fs.writeFileSync(
//       configPath,
//       JSON.stringify(
//         {
//           agent_token: token,
//           api_base_url: "http://localhost:5000"
//         },
//         null,
//         2
//       )
//     );

//     console.log("STEP 2 CONFIG UPDATED");

//     const zipPath = path.resolve(__dirname, "..", "files", "IWF-Agent.zip");
//     console.log("ZIP PATH:", zipPath);

//     console.log("ZIP EXISTS:", fs.existsSync(zipPath));

//     return res.download(zipPath, "IWF-Agent.zip");

//   } catch (err) {
//     console.error("DOWNLOAD ERROR:", err);

//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// });

router.get("/download-agent/:token", async (req, res) => {
  try {
    const { token } = req.params;

    console.log("Agent Download Request:", token);

    // Optional: Token verify
    // const user = await pool.query(
    //   "SELECT id FROM users WHERE agent_token = $1",
    //   [token]
    // );

    // if (user.rows.length === 0) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Invalid activation token",
    //   });
    // }

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