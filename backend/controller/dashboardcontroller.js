const pool = require("../db");



const getDashboardStats = async (req, res) => {
  try {


    let userFilter = `role != 'superadmin'`;
    let values = [];

    if (req.user.role !== "superadmin") {
      userFilter += ` AND organization_id = $1`;
      values.push(req.user.organization_id);
    }



    const users = await pool.query(
      `SELECT COUNT(*) FROM users WHERE ${userFilter}`,
      values
    );


    let orgs;

    if (req.user.role === "superadmin") {
      orgs = await pool.query(
        `SELECT COUNT(*) FROM organizations`
      );
    } else {
      orgs = await pool.query(
        `SELECT COUNT(*) FROM organizations
         WHERE id = $1`,
        [req.user.organization_id]
      );
    }



    let teams;

    if (req.user.role === "superadmin") {
      teams = await pool.query(
        `SELECT COUNT(*) FROM teams`
      );
    } else {
      teams = await pool.query(
        `SELECT COUNT(*) FROM teams
         WHERE organization_id = $1`,
        [req.user.organization_id]
      );
    }



    const onlineUsers = await pool.query(
      `
      SELECT COUNT(*)
      FROM users
      WHERE ${userFilter}
      AND LOWER(status)='online'
      `,
      values
    );



    const idleUsers = await pool.query(
      `
      SELECT COUNT(*)
      FROM users
      WHERE ${userFilter}
      AND LOWER(status)='idle'
      `,
      values
    );



    const offlineUsers = await pool.query(
      `
      SELECT COUNT(*)
      FROM users
      WHERE ${userFilter}
      AND LOWER(status)='offline'
      `,
      values
    );

    res.json({
      totalUsers: Number(users.rows[0].count),
      totalOrganizations: Number(orgs.rows[0].count),
      totalTeams: Number(teams.rows[0].count),
      onlineUsers: Number(onlineUsers.rows[0].count),
      idleUsers: Number(idleUsers.rows[0].count),
      offlineUsers: Number(offlineUsers.rows[0].count),
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Dashboard stats error",
    });
  }
};

// const getRecentActivities = async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT *
//       FROM (
//         SELECT
//           u.name AS user_name,
//           a.app_name,
//           a.start_time,
//           a.end_time,
//           ROW_NUMBER() OVER (
//             PARTITION BY a.app_name
//             ORDER BY a.start_time DESC
//           ) AS rn
//         FROM activity_logs a
//         JOIN users u
//           ON a.user_id = u.id
//       ) t
//       WHERE rn = 1
//       ORDER BY start_time DESC
//       LIMIT 10
//     `);

//     console.log(pool.constructor.name);
//     console.log(result.rows);

//     res.json(result.rows);

//   } catch (err) {
//     console.error("RECENT ACTIVITY ERROR:", err);

//     res.status(500).json({
//       message: "Activity fetch error",
//       error: err.message
//     });
//   }
// };

const getRecentActivities = async (req, res) => {
  try {

    let query = `
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
    `;

    let values = [];


    if (req.user.role !== "superadmin") {
      query += `
        WHERE u.organization_id = $1
      `;
      values.push(req.user.organization_id);
    }

    query += `
      ) t
      WHERE rn = 1
      ORDER BY start_time DESC
      LIMIT 10
    `;

    const result = await pool.query(query, values);

    res.json(result.rows);

  } catch (err) {
    console.error("RECENT ACTIVITY ERROR:", err);

    res.status(500).json({
      message: "Activity fetch error",
      error: err.message
    });
  }
};

// const getLiveUsers = async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT
//         users.id,
//         users.name,
//         users.status,
//         organizations.name AS organization_name,
//         teams.name AS team_name
//       FROM users
//       LEFT JOIN organizations
//         ON users.organization_id = organizations.id
//       LEFT JOIN teams
//         ON users.team_id = teams.id
//       WHERE users.role != 'admin'
//       ORDER BY users.name ASC
//     `);

//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);

//     res.status(500).json({
//       message: "Failed to fetch live users"
//     });
//   }
// };

const getLiveUsers = async (req, res) => {
  try {
    let query = `
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
      WHERE users.role != 'superadmin'
    `;

    let values = [];

    if (req.user.role === "admin") {
      query += `
        AND users.organization_id = $1
        AND users.role NOT IN ('superadmin', 'admin')
      `;
      values.push(req.user.organization_id);
    }

    query += `
      ORDER BY users.name ASC
    `;

    const result = await pool.query(query, values);

    res.json(result.rows);

  } catch (err) {
    console.error("LIVE USER ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// const getOrganizationSummary = async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT
//         o.id,
//         o.name,
//         COUNT(u.id) AS employee_count
//       FROM organizations o
//       LEFT JOIN users u
//         ON u.organization_id = o.id
//         AND u.role != 'admin'
//       GROUP BY o.id, o.name
//       ORDER BY employee_count DESC
//     `);

//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);

//     res.status(500).json({
//       message: "Organization summary error",
//     });
//   }
// };


const getOrganizationSummary = async (req, res) => {
  try {

    let query = `
      SELECT
        o.id,
        o.name,
        COUNT(u.id) AS employee_count
      FROM organizations o
      LEFT JOIN users u
        ON u.organization_id = o.id
        AND u.role != 'superadmin'
    `;

    let values = [];

    if (req.user.role !== "superadmin") {
      query += `
        WHERE o.id = $1
      `;
      values.push(req.user.organization_id);
    }

    query += `
      GROUP BY o.id, o.name
      ORDER BY employee_count DESC
    `;

    const result = await pool.query(query, values);

    res.json(result.rows);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Organization summary error",
    });
  }
};

// const getTopApplicationsToday = async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT
//         app_name,
//         SUM(duration) AS total_duration
//       FROM activity_logs
//       WHERE DATE(start_time) = CURRENT_DATE
//       GROUP BY app_name
//       ORDER BY total_duration DESC
//       LIMIT 10
//     `);

//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       message: "Top applications error",
//     });
//   }
// };

const getTopApplicationsToday = async (req, res) => {
  try {

    let query = `
      SELECT
        a.app_name,
        SUM(a.duration) AS total_duration
      FROM activity_logs a
      JOIN users u
        ON a.user_id = u.id
      WHERE DATE(a.start_time) = CURRENT_DATE
    `;

    let values = [];

    if (req.user.role !== "superadmin") {
      query += `
        AND u.organization_id = $1
      `;
      values.push(req.user.organization_id);
    }

    query += `
      GROUP BY a.app_name
      ORDER BY total_duration DESC
      LIMIT 10
    `;

    const result = await pool.query(query, values);

    res.json(result.rows);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Top applications error",
    });
  }
};

module.exports = { getDashboardStats, getRecentActivities, getLiveUsers, getOrganizationSummary, getTopApplicationsToday };
