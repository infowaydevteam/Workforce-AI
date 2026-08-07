const pool = require("../db");

// Get All Users

const getUsers = async (req, res) => {
  try {
    let result;

    if (req.user.role === "superadmin") {
      result = await pool.query(`
        SELECT
          users.id,
          users.name,
          users.email,
          users.role,
          users.status,
          organizations.name AS organization_name,
          teams.name AS team_name
        FROM users
        LEFT JOIN organizations
          ON users.organization_id = organizations.id
        LEFT JOIN teams
          ON users.team_id = teams.id
        WHERE users.role != 'superadmin'
        ORDER BY users.id DESC
      `);

    } else if (req.user.role === "admin") {

      result = await pool.query(
        `
        SELECT
          users.id,
          users.name,
          users.email,
          users.role,
          users.status,
          organizations.name AS organization_name,
          teams.name AS team_name
        FROM users
        LEFT JOIN organizations
          ON users.organization_id = organizations.id
        LEFT JOIN teams
          ON users.team_id = teams.id
        WHERE users.organization_id = $1
          AND users.role NOT IN ('superadmin', 'admin')
        ORDER BY users.id DESC
        `,
        [req.user.organization_id]
      );

    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    res.status(200).json(result.rows);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch users",
    });
  }
};

// Delete User
const deleteUser = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    // Restricted Alerts
    await client.query(
      "DELETE FROM restricted_alerts WHERE employee_id = $1",
      [id]
    );

    // Activity Logs
    await client.query(
      "DELETE FROM activity_logs WHERE user_id = $1",
      [id]
    );

    // Idle Logs
    await client.query(
      "DELETE FROM idle_logs WHERE user_id = $1",
      [id]
    );

    // Sessions
    await client.query(
      "DELETE FROM sessions WHERE user_id = $1",
      [id]
    );

    await client.query(
      "DELETE FROM users WHERE id = $1",
      [id]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "User deleted successfully"
    });

  } catch (error) {

    await client.query("ROLLBACK");

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  } finally {
    client.release();
  }
};

// const updateStatus = async (req, res) => {
//   try {
//     const { user_id, status } = req.body;
//     console.log("STATUS REQUEST:", req.body);

//     const formattedStatus =
//       status.charAt(0).toUpperCase() +
//       status.slice(1).toLowerCase();

//     const result = await pool.query(
//       `UPDATE users
//        SET status = $1,
//            last_active = NOW()
//        WHERE id = $2
//        RETURNING *`,
//       [formattedStatus, user_id]
//     );

//     res.json({
//       success: true,
//       data: result.rows[0],
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       error: err.message,
//     });
//   }
// };




// controller

const updateStatus = async (req, res) => {
  try {
    const { user_id, status } = req.body;

    console.log("STATUS REQUEST:", req.body);

    const formattedStatus =
      status.charAt(0).toUpperCase() +
      status.slice(1).toLowerCase();

    let result;

    if (formattedStatus === "Online") {
      result = await pool.query(
        `UPDATE users
         SET status = $1,
             last_active = NOW()
         WHERE id = $2
         RETURNING *`,
        [formattedStatus, user_id]
      );
    } else {
      result = await pool.query(
        `UPDATE users
         SET status = $1
         WHERE id = $2
         RETURNING *`,
        [formattedStatus, user_id]
      );
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};



const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.last_active,
        o.name AS organization_name,
        t.name AS team_name
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE u.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};

const getLoginHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    let query = `
      SELECT id, login_time, logout_time, total_duration
      FROM sessions
      WHERE user_id = $1
    `;

    const params = [id];

    if (date) {
      query += ` AND DATE(login_time) = $2`;
      params.push(date);
    }

    query += ` ORDER BY login_time DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error fetching login history" });
  }
};

const getAppUsage = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    let query = `
      SELECT app_name, SUM(duration) AS total_duration
      FROM activity_logs
      WHERE user_id = $1
    `;

    const params = [id];

    if (date) {
      query += ` AND DATE(start_time) = $2`;
      params.push(date);
    }

    query += ` GROUP BY app_name`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getActivitySummary = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    let sessionFilter = `WHERE user_id = $1`;
    let idleFilter = `WHERE user_id = $1`;
    let activityFilter = `WHERE user_id = $1`;

    const params = [id];

    if (date) {
      sessionFilter += ` AND DATE(login_time) = $2`;
      idleFilter += ` AND DATE(start_time) = $2`;
      activityFilter += ` AND DATE(start_time) = $2`;

      params.push(date);
    }

    // Working Time (Completed + Running Sessions)
    const session = await pool.query(
  `
  SELECT
    COUNT(*) AS total_sessions,

    COALESCE(
      SUM(
        CASE
          WHEN logout_time IS NULL
          THEN EXTRACT(EPOCH FROM (NOW() - login_time))
          ELSE total_duration
        END
      ),
      0
    ) AS total_working_time

  FROM sessions
  ${sessionFilter}
  `,
  params
);

    // Idle Time
    const idle = await pool.query(
      `
      SELECT
        COALESCE(SUM(duration),0) AS idle_time
      FROM idle_logs
      ${idleFilter}
      `,
      params
    );

    // Active Time
    const active = await pool.query(
      `
      SELECT
        COALESCE(SUM(duration),0) AS active_time
      FROM activity_logs
      ${activityFilter}
      `,
      params
    );

    res.json({
      total_sessions: Number(session.rows[0].total_sessions),
      total_working_time: Number(session.rows[0].total_working_time),
      active_time: Number(active.rows[0].active_time),
      idle_time: Number(idle.rows[0].idle_time),
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};


// const getActivitySummary = async (req, res) => {

//     try {

//         const { id } = req.params;
//         const { date } = req.query;

//         let sessionFilter = `WHERE user_id = $1`;
//         let activityFilter = `WHERE user_id = $1`;
//         let idleFilter = `WHERE user_id = $1`;

//         const params = [id];

//         if (date) {

//             sessionFilter += ` AND DATE(login_time) = $2`;
//             activityFilter += ` AND DATE(start_time) = $2`;
//             idleFilter += ` AND DATE(start_time) = $2`;

//             params.push(date);

//         }

//         // ===========================
//         // Working Time
//         // ===========================

//         const session = await pool.query(
//             `
//             SELECT

//                 COUNT(*) AS total_sessions,

//                 COALESCE(

//                     SUM(

//                         CASE

//                             WHEN logout_time IS NULL
//                             THEN EXTRACT(EPOCH FROM (NOW() - login_time))

//                             ELSE total_duration

//                         END

//                     ),

//                     0

//                 ) AS working_time

//             FROM sessions

//             ${sessionFilter}
//             `,
//             params
//         );

//         // ===========================
//         // Activity Time
//         // ===========================

//         const activity = await pool.query(
//             `
//             SELECT

//                 COALESCE(
//                     SUM(duration),
//                     0
//                 ) AS activity_time

//             FROM activity_logs

//             ${activityFilter}
//             `,
//             params
//         );

//         // ===========================
//         // Idle Time
//         // ===========================

//         const idle = await pool.query(
//             `
//             SELECT

//                 COALESCE(
//                     SUM(duration),
//                     0
//                 ) AS idle_time

//             FROM idle_logs

//             ${idleFilter}
//             `,
//             params
//         );

//         let workingTime = Number(session.rows[0].working_time);
//         let activityTime = Number(activity.rows[0].activity_time);
//         let idleTime = Number(idle.rows[0].idle_time);


//         activityTime = Math.min(activityTime, workingTime);


//         idleTime = Math.min(
//             idleTime,
//             Math.max(workingTime - activityTime, 0)
//         );


//         const activeTime = Math.max(
//             activityTime - idleTime,
//             0
//         );

//         const offlineTime = Math.max(
//             workingTime - activeTime - idleTime,
//             0
//         );

//         let productivity = 0;

//         if (workingTime > 0) {

//             productivity = Math.round(
//                 (activeTime / workingTime) * 100
//             );

//         }

//         res.json({

//             success: true,

//             total_sessions: Number(session.rows[0].total_sessions),

//             total_working_time: workingTime,

//             active_time: activeTime,

//             idle_time: idleTime,

//             offline_time: offlineTime,

//             productivity

//         });

//     } catch (err) {

//         console.log(err);

//         res.status(500).json({

//             success: false,

//             error: err.message

//         });

//     }

// };

const getActivityLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    let query = `
      SELECT
        app_name,
        MIN(start_time) AS start_time,
        MAX(end_time) AS end_time,
        SUM(duration) AS duration
      FROM activity_logs
      WHERE user_id = $1
    `;

    const params = [id];

    if (date) {
      query += ` AND DATE(start_time) = $2`;
      params.push(date);
    }

    query += `
      GROUP BY app_name
      ORDER BY SUM(duration) DESC
    `;

    const result = await pool.query(query, params);

    res.json(result.rows);

  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Failed to fetch activity logs"
    });
  }
};

const getUserFullReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    const params = [id];

    let sessionFilter = "";
    let activityFilter = "";
    let idleFilter = "";


    if (from && to) {
      params.push(from, to);

      sessionFilter = `AND DATE(login_time) BETWEEN $2 AND $3`;
      activityFilter = `AND DATE(start_time) BETWEEN $2 AND $3`;
      idleFilter = `AND DATE(start_time) BETWEEN $2 AND $3`;
    }


    const user = await pool.query(
      `
      SELECT id, name, email, role, last_active
      FROM users
      WHERE id = $1
      `,
      [id]
    );


    const sessions = await pool.query(
      `
      SELECT id, login_time, logout_time, total_duration
      FROM sessions
      WHERE user_id = $1
      ${sessionFilter}
      ORDER BY login_time DESC
      LIMIT 10
      `,
      params
    );


    const activityLogs = await pool.query(
      `
      SELECT app_name, start_time, end_time, duration
      FROM activity_logs
      WHERE user_id = $1
      ${activityFilter}
      ORDER BY start_time DESC
      LIMIT 20
      `,
      params
    );


    const idleLogs = await pool.query(
      `
      SELECT start_time, end_time, duration
      FROM idle_logs
      WHERE user_id = $1
      ${idleFilter}
      ORDER BY start_time DESC
      LIMIT 20
      `,
      params
    );


    const summary = await pool.query(
      `
      SELECT COALESCE(SUM(total_duration),0) AS total_working_time
      FROM sessions
      WHERE user_id = $1
      ${sessionFilter}
      `,
      params
    );

    const active = await pool.query(
      `
      SELECT COALESCE(SUM(duration),0) AS active_time
      FROM activity_logs
      WHERE user_id = $1
      ${activityFilter}
      `,
      params
    );

    const idle = await pool.query(
      `
      SELECT COALESCE(SUM(duration),0) AS idle_time
      FROM idle_logs
      WHERE user_id = $1
      ${idleFilter}
      `,
      params
    );


    const appUsage = await pool.query(
      `
      SELECT app_name, SUM(duration) AS total_duration
      FROM activity_logs
      WHERE user_id = $1
      ${activityFilter}
      GROUP BY app_name
      ORDER BY total_duration DESC
      `,
      params
    );


    const weeklySummary = await pool.query(
      `
      SELECT
        DATE_TRUNC('week', login_time) AS week,
        SUM(total_duration) AS total_time
      FROM sessions
      WHERE user_id = $1
      ${sessionFilter}
      GROUP BY week
      ORDER BY week DESC
      `,
      params
    );


    return res.json({
      user: user.rows[0],

      summary: {
        total_working_time: Number(summary.rows[0].total_working_time || 0),
        active_time: Number(active.rows[0].active_time || 0),
        idle_time: Number(idle.rows[0].idle_time || 0),
        total_sessions: sessions.rows.length || 0,
      },

      sessions: sessions.rows,
      activityLogs: activityLogs.rows,
      idleLogs: idleLogs.rows,
      appUsage: appUsage.rows,
      weeklySummary: weeklySummary.rows,
    });

  } catch (err) {
    console.log(err);
    return res.status(500).json({
      error: err.message,
    });
  }
};

module.exports = {
  getUsers,
  deleteUser,
  updateStatus,
  getEmployeeById,
  getLoginHistory,
  getAppUsage,
  getActivitySummary,
  getActivityLogs,
  getUserFullReport
};