const pool = require("../db");

// const heartbeat = async (req, res) => {
//   try {
//     const { agent_token } = req.body;

//     if (!agent_token) {
//       return res.status(400).json({
//         success: false,
//         message: "Agent token missing",
//       });
//     }

//     const user = await pool.query(
//       `
//       SELECT id
//       FROM users
//       WHERE agent_token = $1
//       `,
//       [agent_token]
//     );

//     if (user.rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Invalid agent",
//       });
//     }

//     await pool.query(
//       `
//       UPDATE users
//       SET
//       status='Online',
//       last_active=NOW()
//       WHERE agent_token=$1
//       `,
//       [agent_token]
//     );

//     res.json({
//       success: true,
//     });

//     console.log("Heartbeat:", agent_token);

//   } catch (err) {
//     console.error(err);

//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// const heartbeat = async (req, res) => {
//   try {
//     const { agent_token } = req.body;

//     if (!agent_token) {
//       return res.status(400).json({
//         success: false,
//         message: "Agent token missing",
//       });
//     }

//     console.log("HEARTBEAT API HIT");
//     console.log(req.body);

//     const user = await pool.query(
//       `
//       SELECT id, status
//       FROM users
//       WHERE agent_token = $1
//       `,
//       [agent_token]
//     );

//     if (user.rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Invalid agent",
//       });
//     }

//     const currentStatus = user.rows[0].status;

//     if (currentStatus === "Offline") {
//       console.log("Heartbeat skipped (User Offline)");

//       return res.json({
//         success: true,
//         message: "User Offline - Heartbeat Ignored",
//       });
//     }

//     if (currentStatus === "Online" || currentStatus === "Idle") {
//       await pool.query(
//         `
//     UPDATE users
//     SET last_active = NOW()
//     WHERE agent_token = $1
//     `,
//         [agent_token]
//       );
//     }
//     console.log("Last Active Updated");
//     console.log("Heartbeat:", agent_token);
//     console.log("Heartbeat Updated:", new Date().toISOString());
//     res.json({
//       success: true,
//     });

//   } catch (err) {
//     console.error(err);

//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

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