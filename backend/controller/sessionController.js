const pool = require("../db");

// START SESSION
const startSession = async (req, res) => {
  try {
    const { user_id } = req.body;

    const result = await pool.query(
      `INSERT INTO sessions (user_id, login_time)
       VALUES ($1, NOW())
       RETURNING *`,
      [user_id]
    );

    await pool.query(
      `UPDATE users
   SET status = 'Online',
       last_active = NOW()
   WHERE id = $1`,
      [user_id]
    );

    res.json({ success: true, session: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// END SESSION
const endSession = async (req, res) => {
  try {

    console.log("END SESSION API HIT");
    console.log(req.body);
    const { user_id } = req.body;

    const session = await pool.query(
      `SELECT * FROM sessions
       WHERE user_id = $1 AND logout_time IS NULL
       ORDER BY login_time DESC
       LIMIT 1`,
      [user_id]
    );

    if (session.rows.length === 0) {
      return res.status(404).json({ message: "No active session found" });
    }

    const loginTime = session.rows[0].login_time;
    const logoutTime = new Date();

    const duration = Math.floor(
      (logoutTime - new Date(loginTime)) / 1000
    );

    await pool.query(
      `UPDATE sessions
       SET logout_time = NOW(), total_duration = $1
       WHERE id = $2`,
      [duration, session.rows[0].id]
    );

    await pool.query(
      `UPDATE users
       SET status = 'Offline'
       WHERE id = $1`,
      [user_id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  startSession,
  endSession
};