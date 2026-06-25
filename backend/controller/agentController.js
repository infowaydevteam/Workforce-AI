const pool = require("../db");

const verifyAgent = async (req, res) => {
  try {
    const { agent_token } = req.body;

    const user = await pool.query(
      `SELECT id, name, email, agent_token
   FROM users
   WHERE agent_token = $1`,
      [agent_token]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invalid token",
      });
    }

    res.json({
      success: true,
      user_id: user.rows[0].id,
      name: user.rows[0].name,
      email: user.rows[0].email,
      agent_token: user.rows[0].agent_token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

module.exports = {
  verifyAgent,
};