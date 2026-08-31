const pool = require("../db");
const { deleteStoredScreenshot } = require("../services/screenshotStorageService");

// Get All Users
const getUsers = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();

    const userId =
      req.user?.id ??
      req.user?.user_id ??
      req.user?.userId;

    console.log("========== GET USERS ==========");
    console.log("REQ.USER:", req.user);
    console.log("ROLE:", role);
    console.log("USER ID:", userId);

    let query = `
      SELECT
        users.id,
        users.name,
        users.email,
        users.role,
        users.status,
        users.agent_token,
        users.organization_id,
        users.team_id,
        users.manager_id,

        organizations.name AS organization_name,
        organizations.timezone AS timezone,
        teams.name AS team_name,
        managers.name AS manager_name

      FROM users

      LEFT JOIN organizations
        ON users.organization_id = organizations.id

      LEFT JOIN teams
        ON users.team_id = teams.id

      LEFT JOIN users managers
        ON users.manager_id = managers.id

      WHERE users.role != 'superadmin'
    `;

    const values = [];

    // =====================================================
    // ADMIN
    // =====================================================
    if (role === "admin") {

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID not found in token",
        });
      }

      // Admin ki organization aur team DB se nikalo
      const adminResult = await pool.query(
        `
        SELECT
          organization_id,
          team_id
        FROM users
        WHERE id = $1
        `,
        [userId]
      );

      if (adminResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Admin user not found",
        });
      }

      const adminOrganizationId =
        adminResult.rows[0].organization_id;

      const adminTeamId =
        adminResult.rows[0].team_id;

      console.log(
        "ADMIN ORGANIZATION:",
        adminOrganizationId
      );

      console.log(
        "ADMIN TEAM:",
        adminTeamId
      );

      if (!adminOrganizationId) {
        return res.status(400).json({
          success: false,
          message: "Admin is not assigned to any organization",
        });
      }

      // ===================================================
      // ADMIN -> SAME ORGANIZATION
      // ===================================================
      query += `
        AND users.organization_id = $1
      `;

      values.push(adminOrganizationId);

      // ===================================================
      // ADMIN -> SAME TEAM
      // ===================================================
      if (adminTeamId) {
        query += `
          AND users.team_id = $2
        `;

        values.push(adminTeamId);
      }

      // Admin khud ko bhi list me rakhna hai ya nahi
      // requirement ke according yaha exclude nahi kiya hai.
    }

    // =====================================================
    // SUPERADMIN
    // =====================================================
    // Superadmin ke liye koi organization/team filter nahi.
    // Sabhi organizations ke users aayenge.
    
    query += `
      ORDER BY users.id DESC
    `;

    console.log("GET USERS QUERY:", query);
    console.log("GET USERS VALUES:", values);

    const result = await pool.query(query, values);

    console.log("USERS COUNT:", result.rows.length);

    return res.status(200).json(result.rows);

  } catch (error) {
    console.error("GET USERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

// Delete User
const deleteUser = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    const screenshots = await client.query(
      "SELECT storage_path FROM employee_screenshots WHERE employee_id = $1",
      [id]
    );

    for (const screenshot of screenshots.rows) {
      await deleteStoredScreenshot(screenshot.storage_path);
    }

    await client.query(
      "DELETE FROM screenshot_audit_logs WHERE employee_id = $1",
      [id]
    );

    await client.query(
      "DELETE FROM employee_screenshots WHERE employee_id = $1",
      [id]
    );

    // Restricted Alerts
    await client.query(
      "DELETE FROM restricted_alerts WHERE employee_id = $1",
      [id]
    );
    await client.query(
      "DELETE FROM alerts WHERE user_id = $1",
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

const updateUserAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, organization_id, team_id, manager_id } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET role = COALESCE($1, role),
           organization_id = $2,
           team_id = $3,
           manager_id = $4
       WHERE id = $5
       RETURNING id, name, email, role, organization_id, team_id, manager_id`,
      [
        role || null,
        organization_id || null,
        team_id || null,
        manager_id || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update user assignment" });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { user_id, status } = req.body;
    console.log("STATUS REQUEST:", req.body);

    const formattedStatus =
      status.charAt(0).toUpperCase() +
      status.slice(1).toLowerCase();
    const normalizedStatus =
      formattedStatus === "Paused" ? "Offline" : formattedStatus;

    const result = await pool.query(
      `UPDATE users
       SET status = $1,
           last_active = NOW()
       WHERE id = $2
       RETURNING *`,
      [normalizedStatus, user_id]
    );

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


// const updateStatus = async (req, res) => {
//   try {
//     const {
//       user_id,
//       status,
//       last_active
//     } = req.body;

//     console.log("STATUS REQUEST:", req.body);

//     const formattedStatus =
//       status.charAt(0).toUpperCase() +
//       status.slice(1).toLowerCase();

//     const normalizedStatus =
//       formattedStatus === "Paused"
//         ? "Offline"
//         : formattedStatus;

//     const result = await pool.query(
//       `
//       UPDATE users
//       SET
//         status = $1,
//         last_active = $2
//       WHERE id = $3
//       RETURNING *
//       `,
//       [
//         normalizedStatus,
//         last_active,
//         user_id
//       ]
//     );

//     res.json({
//       success: true,
//       data: result.rows[0],
//     });

//   } catch (err) {
//     console.error("UPDATE STATUS ERROR:", err);

//     res.status(500).json({
//       success: false,
//       error: err.message,
//     });
//   }
// };

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
        u.agent_token,
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

// const getLoginHistory = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { date } = req.query;

//     let query = `
//       SELECT id, login_time, logout_time, total_duration
//       FROM sessions
//       WHERE user_id = $1
//     `;

//     const params = [id];

//     if (date) {
//       query += ` AND DATE(login_time) = $2`;
//       params.push(date);
//     }

//     query += ` ORDER BY login_time DESC`;

//     const result = await pool.query(query, params);

//     res.json(result.rows);
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({ message: "Error fetching login history" });
//   }
// };

const getLoginHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    console.log("LOGIN HISTORY =>", {
      userId: id,
      date,
    });

    let query = `
      SELECT
        id,
        TO_CHAR(login_time, 'YYYY-MM-DD HH24:MI:SS.MS') AS login_time,
        TO_CHAR(logout_time, 'YYYY-MM-DD HH24:MI:SS.MS') AS logout_time,
        total_duration
      FROM sessions
      WHERE user_id = $1
    `;

    const params = [id];

    if (date) {
      query += ` AND DATE(login_time) = $2`;
      params.push(date);
    }

    query += ` ORDER BY login_time DESC`;

    console.log("QUERY =>", query);
    console.log("PARAMS =>", params);

    const result = await pool.query(query, params);

    console.log("LOGIN HISTORY RESULT =>", result.rows);

    res.json(result.rows);

  } catch (err) {
    console.error("LOGIN HISTORY ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Error fetching login history",
    });
  }
};

const getAppUsage = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    let query = `
      SELECT app_name, SUM(GREATEST(duration, 0)) AS total_duration
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

    const params = [id];

    if (date) {
      sessionFilter += ` AND DATE(login_time) = $2`;
      idleFilter += ` AND DATE(start_time) = $2`;
      params.push(date);
    }

    const session = await pool.query(`
      SELECT
        SUM(GREATEST(total_duration, 0)) AS total_working_time,
        COUNT(*) AS total_sessions
      FROM sessions
      ${sessionFilter}
    `, params);

    const idle = await pool.query(`
      SELECT SUM(GREATEST(duration, 0)) AS idle_time
      FROM idle_logs
      ${idleFilter}
    `, params);

    const active = await pool.query(`
      SELECT SUM(GREATEST(duration, 0)) AS active_time
      FROM activity_logs
      ${idleFilter}
    `, params);

    res.json({
      total_sessions: session.rows[0].total_sessions || 0,
      total_working_time: session.rows[0].total_working_time || 0,
      active_time: active.rows[0].active_time || 0,
      idle_time: idle.rows[0].idle_time || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// const getActivityLogs = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { date } = req.query;

//     let query = `
//       SELECT
//         app_name,
//         MIN(start_time) AS start_time,
//         MAX(end_time) AS end_time,
//         SUM(GREATEST(duration, 0)) AS duration
//       FROM activity_logs
//       WHERE user_id = $1
//     `;

//     const params = [id];

//     if (date) {
//       query += ` AND DATE(start_time) = $2`;
//       params.push(date);
//     }

//     query += `
//       GROUP BY app_name
//       ORDER BY SUM(GREATEST(duration, 0)) DESC
//     `;

//     const result = await pool.query(query, params);

//     res.json(result.rows);

//   } catch (err) {
//     console.log(err);
//     res.status(500).json({
//       message: "Failed to fetch activity logs"
//     });
//   }
// };


const getActivityLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    let query = `
      SELECT
        id,
        app_name,
        TO_CHAR(start_time, 'YYYY-MM-DD HH24:MI:SS.MS') AS start_time,
        TO_CHAR(end_time, 'YYYY-MM-DD HH24:MI:SS.MS') AS end_time,
        GREATEST(duration, 0) AS duration,
        productivity_category
      FROM activity_logs
      WHERE user_id = $1
    `;

    const params = [id];

    if (date) {
      query += `
        AND DATE(start_time) = $2
      `;
      params.push(date);
    }

    query += `
      ORDER BY start_time DESC
    `;

    const result = await pool.query(query, params);

    res.json(result.rows);

  } catch (err) {
    console.error("GET ACTIVITY LOGS ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch activity logs",
      error: err.message
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

    // =====================
    // DATE FILTER
    // =====================
    if (from && to) {
      params.push(from, to);

      sessionFilter = `AND DATE(login_time) BETWEEN $2 AND $3`;
      activityFilter = `AND DATE(start_time) BETWEEN $2 AND $3`;
      idleFilter = `AND DATE(start_time) BETWEEN $2 AND $3`;
    }

    // =====================
    // USER
    // =====================
    const user = await pool.query(
      `
      SELECT id, name, email, role, last_active
      FROM users
      WHERE id = $1
      `,
      [id]
    );

    // =====================
    // SESSIONS (LIMITED)
    // =====================
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

    // =====================
    // ACTIVITY LOGS (LIMITED)
    // =====================
    const activityLogs = await pool.query(
      `
      SELECT app_name, start_time, end_time, GREATEST(duration, 0) AS duration
      FROM activity_logs
      WHERE user_id = $1
      ${activityFilter}
      ORDER BY start_time DESC
      LIMIT 20
      `,
      params
    );

    // =====================
    // IDLE LOGS
    // =====================
    const idleLogs = await pool.query(
      `
      SELECT start_time, end_time, GREATEST(duration, 0) AS duration
      FROM idle_logs
      WHERE user_id = $1
      ${idleFilter}
      ORDER BY start_time DESC
      LIMIT 20
      `,
      params
    );

    // =====================
    // SUMMARY
    // =====================
    const summary = await pool.query(
      `
      SELECT COALESCE(SUM(GREATEST(total_duration, 0)),0) AS total_working_time
      FROM sessions
      WHERE user_id = $1
      ${sessionFilter}
      `,
      params
    );

    const active = await pool.query(
      `
      SELECT COALESCE(SUM(GREATEST(duration, 0)),0) AS active_time
      FROM activity_logs
      WHERE user_id = $1
      ${activityFilter}
      `,
      params
    );

    const idle = await pool.query(
      `
      SELECT COALESCE(SUM(GREATEST(duration, 0)),0) AS idle_time
      FROM idle_logs
      WHERE user_id = $1
      ${idleFilter}
      `,
      params
    );

    // =====================
    // APP USAGE
    // =====================
    const appUsage = await pool.query(
      `
      SELECT app_name, SUM(GREATEST(duration, 0)) AS total_duration
      FROM activity_logs
      WHERE user_id = $1
      ${activityFilter}
      GROUP BY app_name
      ORDER BY total_duration DESC
      `,
      params
    );

    // =====================
    // WEEKLY SUMMARY (NEW FIX)
    // =====================
    const weeklySummary = await pool.query(
      `
      SELECT
        DATE_TRUNC('week', login_time) AS week,
        SUM(GREATEST(total_duration, 0)) AS total_time
      FROM sessions
      WHERE user_id = $1
      ${sessionFilter}
      GROUP BY week
      ORDER BY week DESC
      `,
      params
    );

    // =====================
    // RESPONSE (CLEAN STRUCTURE)
    // =====================
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
  updateUserAssignment,
  updateStatus,
  getEmployeeById,
  getLoginHistory,
  getAppUsage,
  getActivitySummary,
  getActivityLogs,
  getUserFullReport
};
