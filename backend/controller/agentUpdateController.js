const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const pool = require("../db");

const updatesRoot = path.resolve(__dirname, "..", "agent-updates");
const manifestPath = path.join(updatesRoot, "manifest.json");
const allowedPlatforms = new Set(["windows", "macos"]);

const readManifest = async () => {
  const json = await fs.promises.readFile(manifestPath, "utf8");
  return JSON.parse(json);
};

const validateAgentToken = async (agentToken) => {
  if (!agentToken) return null;

  const result = await pool.query(
    `SELECT id, organization_id
       FROM users
      WHERE agent_token = $1`,
    [agentToken]
  );

  return result.rows[0] || null;
};

const compareVersions = (left, right) => {
  const parse = (value) =>
    String(value || "0")
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0);
  const a = parse(left);
  const b = parse(right);
  const length = Math.max(a.length, b.length);

  for (let i = 0; i < length; i += 1) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }

  return 0;
};

const resolveArtifactPath = (platform, version, packageName) => {
  const artifactPath = path.resolve(updatesRoot, platform, version, packageName);
  const platformRoot = path.resolve(updatesRoot, platform, version);

  if (!artifactPath.startsWith(`${platformRoot}${path.sep}`)) {
    return null;
  }

  return artifactPath;
};

const getBaseUrl = (req) =>
  process.env.API_BASE_URL || `${req.protocol}://${req.get("host")}`;

const sha256File = async (filePath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });

const buildUpdateResponse = async (req, platform, currentVersion, platformManifest) => {
  const latestVersion = platformManifest.latest_version;
  const updateAvailable =
    Boolean(platformManifest.enabled) &&
    compareVersions(latestVersion, currentVersion) > 0;

  const artifactPath = resolveArtifactPath(
    platform,
    latestVersion,
    platformManifest.package_name
  );
  const artifactExists = artifactPath ? fs.existsSync(artifactPath) : false;
  const canDownload = updateAvailable && artifactExists;
  const checksum =
    artifactExists && !platformManifest.checksum_sha256
      ? await sha256File(artifactPath)
      : platformManifest.checksum_sha256 || "";

  return {
    success: true,
    platform,
    current_version: currentVersion,
    latest_version: latestVersion,
    update_available: canDownload,
    mandatory: Boolean(platformManifest.mandatory),
    package_name: platformManifest.package_name,
    package_size_bytes: artifactExists ? fs.statSync(artifactPath).size : 0,
    checksum_sha256: checksum,
    release_notes: platformManifest.release_notes || [],
    download_url: canDownload
      ? `${getBaseUrl(req)}/api/agent/updates/download/${platform}/${latestVersion}?agent_token=${encodeURIComponent(
          req.query.agent_token
        )}`
      : null,
    message:
      updateAvailable && !artifactExists
        ? "Update manifest is newer, but the package has not been uploaded yet."
        : undefined,
  };
};

const getUpdateManifest = async (req, res) => {
  try {
    const { platform, version, agent_token: agentToken } = req.query;

    if (!allowedPlatforms.has(platform)) {
      return res.status(400).json({
        success: false,
        message: "platform must be windows or macos",
      });
    }

    if (!version) {
      return res.status(400).json({
        success: false,
        message: "version is required",
      });
    }

    const user = await validateAgentToken(agentToken);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid token",
      });
    }

    const manifest = await readManifest();
    const platformManifest = manifest.platforms?.[platform];

    if (!platformManifest) {
      return res.status(404).json({
        success: false,
        message: "No update channel configured for this platform",
      });
    }

    const response = await buildUpdateResponse(
      req,
      platform,
      version,
      platformManifest
    );

    return res.json(response);
  } catch (err) {
    console.error("AGENT UPDATE MANIFEST ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to read update manifest",
    });
  }
};

const downloadUpdatePackage = async (req, res) => {
  try {
    const { platform, version } = req.params;
    const { agent_token: agentToken } = req.query;

    if (!allowedPlatforms.has(platform)) {
      return res.status(400).json({
        success: false,
        message: "platform must be windows or macos",
      });
    }

    const user = await validateAgentToken(agentToken);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid token",
      });
    }

    const manifest = await readManifest();
    const platformManifest = manifest.platforms?.[platform];

    if (!platformManifest || platformManifest.latest_version !== version) {
      return res.status(404).json({
        success: false,
        message: "Update package is not listed in the active manifest",
      });
    }

    const artifactPath = resolveArtifactPath(
      platform,
      version,
      platformManifest.package_name
    );

    if (!artifactPath || !fs.existsSync(artifactPath)) {
      return res.status(404).json({
        success: false,
        message: "Update package not found",
      });
    }

    return res.download(artifactPath, platformManifest.package_name);
  } catch (err) {
    console.error("AGENT UPDATE DOWNLOAD ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to download update package",
    });
  }
};

const downloadLatestAgentPackage = async (req, res) => {
  try {
    const { token } = req.params;
    const { platform } = req.query;

    const user = await validateAgentToken(token);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (!platform) {
      const baseUrl = getBaseUrl(req);
      const installConfigUrl = `${baseUrl}/api/agent/install-config/${encodeURIComponent(
        token
      )}`;
      const windowsUrl = `${baseUrl}/api/agent/download-agent/${encodeURIComponent(
        token
      )}?platform=windows`;
      const macosUrl = `${baseUrl}/api/agent/download-agent/${encodeURIComponent(
        token
      )}?platform=macos`;

      if (req.query.format === "json") {
        return res.json({
          success: true,
          agent_token: token,
          install_config_url: installConfigUrl,
          downloads: {
            windows: windowsUrl,
            macos: macosUrl,
          },
        });
      }

      return res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>IWF Agent Download</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #172033; }
    main { max-width: 560px; margin: 0 auto; }
    a { display: block; margin: 12px 0; padding: 12px 14px; border: 1px solid #ccd3df; border-radius: 6px; color: #0b5cab; text-decoration: none; }
    code { background: #f3f5f8; padding: 2px 4px; border-radius: 4px; }
  </style>
</head>
<body>
  <main>
    <h1>IWF Agent Download</h1>
    <p>Select the installer for your computer.</p>
    <a href="${windowsUrl}">Download for Windows</a>
    <a href="${macosUrl}">Download for macOS</a>
    <p>Installer config: <code>${installConfigUrl}</code></p>
  </main>
</body>
</html>`);
    }

    if (!allowedPlatforms.has(platform)) {
      return res.status(400).json({
        success: false,
        message: "platform must be windows or macos",
      });
    }

    const manifest = await readManifest();
    const platformManifest = manifest.platforms?.[platform];

    if (!platformManifest) {
      return res.status(404).json({
        success: false,
        message: "No agent package configured for this platform",
      });
    }

    const artifactPath = resolveArtifactPath(
      platform,
      platformManifest.latest_version,
      platformManifest.package_name
    );

    if (!artifactPath || !fs.existsSync(artifactPath)) {
      return res.status(404).json({
        success: false,
        message: "Agent package not found",
      });
    }

    return res.download(artifactPath, platformManifest.package_name);
  } catch (err) {
    console.error("LATEST AGENT DOWNLOAD ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to download agent package",
    });
  }
};

const getInstallConfig = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await validateAgentToken(token);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid token",
      });
    }

    return res.json({
      success: true,
      agent_token: token,
      api_base_url: getBaseUrl(req),
    });
  } catch (err) {
    console.error("AGENT INSTALL CONFIG ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load install config",
    });
  }
};

module.exports = {
  getUpdateManifest,
  downloadUpdatePackage,
  downloadLatestAgentPackage,
  getInstallConfig,
};
