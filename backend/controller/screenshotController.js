const pool = require("../db");
const {
  encryptAndStoreScreenshot,
  readAndDecryptScreenshot,
} = require("../services/screenshotStorageService");

const MAX_SCREENSHOT_BYTES = Number(process.env.SCREENSHOT_MAX_BYTES || 5 * 1024 * 1024);
const RETENTION_DAYS = Number(process.env.SCREENSHOT_RETENTION_DAYS || 30);

const getImageInfo = (buffer) => {
  if (
    buffer.length > 10 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8
  ) {
    let offset = 2;

    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);

      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          mimeType: "image/jpeg",
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }

      offset += 2 + length;
    }

    return { mimeType: "image/jpeg" };
  }

  if (
    buffer.length > 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return {
      mimeType: "image/png",
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  return null;
};

const canAccessEmployee = (viewer, employee) => {
  if (viewer.role === "superadmin") {
    return true;
  }

  if (["admin", "hr"].includes(viewer.role)) {
    return String(viewer.organization_id) === String(employee.organization_id);
  }

  return false;
};

const addAuditLog = async (req, { action, screenshotId = null, employeeId = null, filters = null }) => {
  await pool.query(
    `INSERT INTO screenshot_audit_logs
     (viewer_id, screenshot_id, employee_id, action, filters, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      req.user?.id || null,
      screenshotId,
      employeeId,
      action,
      filters ? JSON.stringify(filters) : null,
      req.ip,
      req.get("user-agent") || "",
    ]
  );
};

const uploadScreenshot = async (req, res) => {
  try {
    const { agent_token, employee_id, captured_at, image_base64 } = req.body;

    if (!agent_token || !employee_id || !captured_at || !image_base64) {
      return res.status(400).json({
        success: false,
        message: "agent_token, employee_id, captured_at, and image_base64 are required",
      });
    }

    const employee = await pool.query(
      `SELECT id, organization_id, status
       FROM users
       WHERE id = $1
         AND agent_token = $2
         AND role NOT IN ('admin', 'superadmin', 'hr')`,
      [employee_id, agent_token]
    );

    if (employee.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Invalid agent token or employee",
      });
    }

    const buffer = Buffer.from(
      String(image_base64).replace(/^data:image\/[a-zA-Z]+;base64,/, ""),
      "base64"
    );

    if (buffer.length === 0 || buffer.length > MAX_SCREENSHOT_BYTES) {
      return res.status(413).json({
        success: false,
        message: "Screenshot size is invalid or too large",
      });
    }

    const imageInfo = getImageInfo(buffer);

    if (!imageInfo) {
      return res.status(415).json({
        success: false,
        message: "Only JPEG and PNG screenshots are supported",
      });
    }

    const capturedDate = new Date(captured_at);

    if (Number.isNaN(capturedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "captured_at must be a valid timestamp",
      });
    }

    const stored = await encryptAndStoreScreenshot({
      employeeId: employee_id,
      capturedAt: capturedDate,
      buffer,
    });

    const result = await pool.query(
      `INSERT INTO employee_screenshots
       (employee_id, organization_id, captured_at, storage_path, iv, auth_tag,
        mime_type, byte_size, width, height, sha256, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
               NOW() + ($12 || ' days')::interval)
       RETURNING id, captured_at`,
      [
        employee.rows[0].id,
        employee.rows[0].organization_id,
        capturedDate,
        stored.storagePath,
        stored.iv,
        stored.authTag,
        imageInfo.mimeType,
        buffer.length,
        imageInfo.width || null,
        imageInfo.height || null,
        stored.sha256,
        RETENTION_DAYS,
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to upload screenshot",
    });
  }
};

const listScreenshotEmployees = async (req, res) => {
  try {
    const params = [];
    let where = "WHERE u.role NOT IN ('superadmin', 'admin', 'hr')";

    if (req.user.role !== "superadmin") {
      params.push(req.user.organization_id);
      where += ` AND u.organization_id = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT DISTINCT u.id, u.name, u.email, u.organization_id
       FROM users u
       ${where}
       ORDER BY u.name ASC`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch screenshot employees",
    });
  }
};

const listScreenshots = async (req, res) => {
  try {
    const { employee_id, from, to } = req.query;
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const offset = (page - 1) * limit;
    const params = [];
    const filters = [];

    if (req.user.role !== "superadmin") {
      params.push(req.user.organization_id);
      filters.push(`s.organization_id = $${params.length}`);
    }

    if (employee_id) {
      params.push(employee_id);
      filters.push(`s.employee_id = $${params.length}`);
    }

    if (from) {
      params.push(from);
      filters.push(`DATE(s.captured_at) >= $${params.length}`);
    }

    if (to) {
      params.push(to);
      filters.push(`DATE(s.captured_at) <= $${params.length}`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const total = await pool.query(
      `SELECT COUNT(*) AS count
       FROM employee_screenshots s
       JOIN users u ON u.id = s.employee_id
       ${where}`,
      params
    );

    const result = await pool.query(
      `SELECT
         s.id,
         s.employee_id,
         u.name AS employee_name,
         u.email AS employee_email,
         s.organization_id,
         s.captured_at,
         s.mime_type,
         s.byte_size,
         s.width,
         s.height,
         s.created_at
       FROM employee_screenshots s
       JOIN users u ON u.id = s.employee_id
       ${where}
       ORDER BY s.captured_at DESC
       LIMIT $${params.length + 1}
       OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    await addAuditLog(req, {
      action: "search",
      filters: { employee_id: employee_id || null, from: from || null, to: to || null, page, limit },
    });

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total: Number(total.rows[0].count),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch screenshots",
    });
  }
};

const streamScreenshotImage = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         s.*,
         u.organization_id AS employee_organization_id
       FROM employee_screenshots s
       JOIN users u ON u.id = s.employee_id
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Screenshot not found" });
    }

    const screenshot = result.rows[0];

    if (!canAccessEmployee(req.user, { organization_id: screenshot.employee_organization_id })) {
      return res.status(403).json({ success: false, message: "Access forbidden" });
    }

    const image = await readAndDecryptScreenshot({
      storagePath: screenshot.storage_path,
      iv: screenshot.iv,
      authTag: screenshot.auth_tag,
    });

    await addAuditLog(req, {
      action: "view",
      screenshotId: screenshot.id,
      employeeId: screenshot.employee_id,
    });

    res.setHeader("Content-Type", screenshot.mime_type);
    res.setHeader("Cache-Control", "private, no-store");
    res.send(image);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to load screenshot",
    });
  }
};

module.exports = {
  uploadScreenshot,
  listScreenshotEmployees,
  listScreenshots,
  streamScreenshotImage,
};
