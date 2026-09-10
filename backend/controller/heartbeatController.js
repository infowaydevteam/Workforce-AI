const pool = require("../db");
const { recordHeartbeat } = require("../services/idleAlertService");

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

    const updatedUser = await recordHeartbeat(agent_token);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Invalid agent",
      });
    }

    console.log("Heartbeat Updated:", updatedUser);


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
