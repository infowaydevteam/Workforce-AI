const pool = require("../db");

// START SESSION
const startSession = async (req, res) => {
  try {
    const { user_id,login_time} = req.body;

    // Check if active session already exists
    const existing = await pool.query(
      `SELECT id
       FROM sessions
       WHERE user_id = $1
       AND logout_time IS NULL
       LIMIT 1`,
      [user_id]
    );

    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        message: "Session already running",
        session_id: existing.rows[0].id,
      });
    }

    // Create new session
    const result = await pool.query(
      `INSERT INTO sessions (user_id, login_time)
       VALUES ($1, $2)
       RETURNING *`,
      [user_id, login_time]
    );

    await pool.query(
      `UPDATE users
       SET status = 'Online',
           last_active = NOW()
       WHERE id = $1`,
      [user_id]
    );

    res.json({
      success: true,
      session: result.rows[0],
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// END SESSION
const endSession = async (req, res) => {
  try {
    console.log("END SESSION API HIT");
    console.log(req.body);

    const { user_id, logout_time } = req.body;

    if (!user_id || !logout_time) {
      return res.status(400).json({
        success: false,
        message: "user_id and logout_time are required",
      });
    }

    const session = await pool.query(
      `
      SELECT id, login_time
      FROM sessions
      WHERE user_id = $1
        AND logout_time IS NULL
      ORDER BY login_time DESC
      LIMIT 1
      `,
      [user_id]
    );

    if (session.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active session found",
      });
    }

    const sessionId = session.rows[0].id;
    const loginTime = session.rows[0].login_time;

    // Agent se PC ka local time aa raha hai
    const duration = Math.max(
      0,
      Math.floor(
        (new Date(logout_time) - new Date(loginTime)) / 1000
      )
    );

    await pool.query(
      `
      UPDATE sessions
      SET
        logout_time = $1,
        total_duration = $2
      WHERE id = $3
        AND logout_time IS NULL
      `,
      [
        logout_time,
        duration,
        sessionId
      ]
    );

    await pool.query(
      `
      UPDATE users
      SET status = 'Offline'
      WHERE id = $1
      `,
      [user_id]
    );

    return res.json({
      success: true,
      session_id: sessionId,
      logout_time,
      total_duration: duration,
    });

  } catch (err) {
    console.error("END SESSION ERROR:", err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

module.exports = {
  startSession,
  endSession
};
