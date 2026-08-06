const express = require("express");
const { verifyAgent } = require("../controller/agentController");
const { getAgentConfig } = require("../controller/adminWorkflowController");
const {
  getUpdateManifest,
  downloadUpdatePackage,
  downloadLatestAgentPackage,
  getInstallConfig,
} = require("../controller/agentUpdateController");
const router = express.Router();


router.post("/verify", verifyAgent);
router.get("/config", getAgentConfig);
router.get("/updates", getUpdateManifest);
router.get("/updates/download/:platform/:version", downloadUpdatePackage);
router.get("/install-config/:token", getInstallConfig);
router.get("/download-agent/:token", downloadLatestAgentPackage);

module.exports = router;
