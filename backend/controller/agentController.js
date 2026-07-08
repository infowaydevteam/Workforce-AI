const pool = require("../db");

const verifyAgent = async (req, res) => {
  try {
    const { agent_token } = req.body;

    const user = await pool.query(
      `UPDATE users
       SET
        agent_installed_at = COALESCE(agent_installed_at, NOW()),
        invitation_status = 'accepted',
        last_active = NOW()
       WHERE agent_token = $1
       RETURNING id, name, email, agent_installed_at, invitation_status
      `,
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
      agent_installed_at: user.rows[0].agent_installed_at,
      invitation_status: user.rows[0].invitation_status,
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
