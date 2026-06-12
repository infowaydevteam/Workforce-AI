const pool = require("../db");



const getDashboardStats = async (req, res) => {
  try {
    const users = await pool.query(` SELECT COUNT(*) FROM users WHERE role != 'admin'`);

    const orgs = await pool.query(`
  SELECT COUNT(*) FROM organizations
`);

    const teams = await pool.query(`
  SELECT COUNT(*) FROM teams
`);

    const allUsers = await pool.query(`
  SELECT id,name,status,last_active
  FROM users
  WHERE role != 'admin'
`);

    console.log("ALL USERS =>");
    console.table(allUsers.rows);

    const onlineUsers = await pool.query(`
  SELECT COUNT(*)
  FROM users
  WHERE role != 'admin'
  AND LOWER(status) = 'online'
`);
    console.log(onlineUsers.rows);
    const idleUsers = await pool.query(`
  SELECT COUNT(*)
  FROM users
  WHERE role != 'admin'
  AND LOWER(status) = 'idle'
`);

    const offlineUsers = await pool.query(`
  SELECT COUNT(*)
  FROM users
  WHERE role != 'admin'
  AND LOWER(status) = 'offline'
`);

    res.json({
      totalUsers: Number(users.rows[0].count),
      totalOrganizations: Number(orgs.rows[0].count),
      totalTeams: Number(teams.rows[0].count),

      onlineUsers: Number(
        onlineUsers.rows[0].count
      ),

      idleUsers: Number(
        idleUsers.rows[0].count
      ),

      offlineUsers: Number(
        offlineUsers.rows[0].count
      ),
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Dashboard stats error",
    });

  }
};

const getRecentActivities = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM (
        SELECT
          u.name AS user_name,
          a.app_name,
          a.start_time,
          a.end_time,
          ROW_NUMBER() OVER (
            PARTITION BY a.app_name
            ORDER BY a.start_time DESC
          ) AS rn
        FROM activity_logs a
        JOIN users u
          ON a.user_id = u.id
      ) t
      WHERE rn = 1
      ORDER BY start_time DESC
      LIMIT 10
    `);

    console.log(pool.constructor.name);
    console.log(result.rows);

    res.json(result.rows);

  } catch (err) {
    console.error("RECENT ACTIVITY ERROR:", err);

    res.status(500).json({
      message: "Activity fetch error",
      error: err.message
    });
  }
};

const getLiveUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        users.id,
        users.name,
        users.status,
        organizations.name AS organization_name,
        teams.name AS team_name
      FROM users
      LEFT JOIN organizations
        ON users.organization_id = organizations.id
      LEFT JOIN teams
        ON users.team_id = teams.id
      WHERE users.role != 'admin'
      ORDER BY users.name ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to fetch live users"
    });
  }
};

const getOrganizationSummary = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        o.id,
        o.name,
        COUNT(u.id) AS employee_count
      FROM organizations o
      LEFT JOIN users u
        ON u.organization_id = o.id
        AND u.role != 'admin'
      GROUP BY o.id, o.name
      ORDER BY employee_count DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Organization summary error",
    });
  }
};

const getTopApplicationsToday = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        app_name,
        SUM(duration) AS total_duration
      FROM activity_logs
      WHERE DATE(start_time) = CURRENT_DATE
      GROUP BY app_name
      ORDER BY total_duration DESC
      LIMIT 10
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Top applications error",
    });
  }
};

module.exports = { getDashboardStats, getRecentActivities, getLiveUsers, getOrganizationSummary, getTopApplicationsToday };