const express = require("express");
const { verifyAgent } = require("../controller/agentController");
const path = require("path");
const router = express.Router();
const fs = require("fs");


router.post("/verify", verifyAgent);

// router.get("/download-agent/:token", async (req, res) => {
//   try {
//     const { token } = req.params;

//     console.log("TOKEN:", token);

//     // config.json ka path
//     const configPath = path.resolve(
//       __dirname,
//       "..",
//       "files",
//       "config.json"
//     );

//     // token inject karo
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

//     console.log(
//       "UPDATED CONFIG:",
//       fs.readFileSync(configPath, "utf8")
//     );

//     const filePath = path.resolve(
//       __dirname,
//       "..",
//       "files",
//       "IWF-Agent.exe"
//     );

//     return res.download(filePath, "IWF-Agent.exe");

//   } catch (err) {
//     console.error("Download Error:", err);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to download agent"
//     });
//   }
// });

router.get("/download-agent/:token", async (req, res) => {
  try {
    const { token } = req.params;

    // config update
    const configPath = path.resolve(__dirname, "..", "files", "config.json");

    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          agent_token: token,
          api_base_url: "http://localhost:5000"
        },
        null,
        2
      )
    );

    // ZIP bhejo
    const zipPath = path.resolve(__dirname, "..", "files", "IWF-Agent.zip");

    return res.download(zipPath, "IWF-Agent.zip");

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Failed to download agent"
    });
  }
});

module.exports = router;