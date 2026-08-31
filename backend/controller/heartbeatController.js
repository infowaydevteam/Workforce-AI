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

    console.log("HEARTBEAT API HIT");
    console.log("Heartbeat PID:", process.pid);
    console.log(req.body);

    const result = await pool.query(
      `
      UPDATE users
      SET last_active = NOW()
      WHERE agent_token = $1
      RETURNING id, status, last_active
      `,
      [agent_token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invalid agent",
      });
    }

    console.log("Heartbeat Updated:", result.rows[0]);


    res.json({
      success: true,
    });

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