const pool = require("../db");

const heartbeat = async (req, res) => {
  try {
    const { agent_token } = req.body;

    if (!agent_token) {
      return res.status(400).json({
        success: false,
        message: "Agent token missing",
      });
    }

    const user = await pool.query(
      `
      SELECT id
      FROM users
      WHERE agent_token = $1
      `,
      [agent_token]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invalid agent",
      });
    }

    await pool.query(
      `
      UPDATE users
      SET
      status='Online',
      last_active=NOW()
      WHERE agent_token=$1
      `,
      [agent_token]
    );

    res.json({
      success: true,
    });

    console.log("Heartbeat:", agent_token);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  heartbeat,
};