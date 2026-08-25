const pool = require("../db");
const { deleteStoredScreenshot } = require("./screenshotStorageService");

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

const cleanupExpiredScreenshots = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const expired = await client.query(
      `SELECT id, storage_path
       FROM employee_screenshots
       WHERE expires_at IS NOT NULL
         AND expires_at < NOW()
       LIMIT 500`
    );

    for (const row of expired.rows) {
      await deleteStoredScreenshot(row.storage_path);
    }

    if (expired.rows.length > 0) {
      await client.query(
        `DELETE FROM employee_screenshots
         WHERE id = ANY($1::int[])`,
        [expired.rows.map((row) => row.id)]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Screenshot cleanup failed:", err.message);
  } finally {
    client.release();
  }
};

const startScreenshotCleanup = () => {
  cleanupExpiredScreenshots();

  setInterval(() => {
    cleanupExpiredScreenshots();
  }, CLEANUP_INTERVAL_MS);
};

module.exports = startScreenshotCleanup;
