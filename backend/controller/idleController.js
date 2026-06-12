const pool = require("../db");

// LOG IDLE
const logIdle = async (req, res) => {
  try {
    const { user_id, start_time, end_time } = req.body;

    const duration = Math.floor(
      (new Date(end_time) - new Date(start_time)) / 1000
    );

    const result = await pool.query(
      `INSERT INTO idle_logs
       (user_id, start_time, end_time, duration)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, start_time, end_time, duration]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  logIdle
};