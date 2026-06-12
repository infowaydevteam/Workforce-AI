const pool = require("../db");

// Calculate productivity score for a single user
const getUserProductivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const { from, to, date } = req.query;

    const params = [userId];
    let dateFilter = "";

    if (date) {
      dateFilter = "AND DATE(start_time) = $2";
      params.push(date);
    } else if (from && to) {
      dateFilter = "AND DATE(start_time) BETWEEN $2 AND $3";
      params.push(from, to);
    }

    // Total active time
    const totalActive = await pool.query(
      `SELECT COALESCE(SUM(duration), 0) AS total FROM activity_logs WHERE user_id = $1 ${dateFilter}`,
      params
    );

    // Productive time (classified apps)
    const productiveTime = await pool.query(
      `SELECT COALESCE(SUM(al.duration), 0) AS total
       FROM activity_logs al
       JOIN app_categories ac ON LOWER(al.app_name) = LOWER(ac.app_name)
       WHERE al.user_id = $1 AND ac.is_productive = true ${dateFilter}`,
      params
    );

    // Unproductive time
    const unproductiveTime = await pool.query(
      `SELECT COALESCE(SUM(al.duration), 0) AS total
       FROM activity_logs al
       JOIN app_categories ac ON LOWER(al.app_name) = LOWER(ac.app_name)
       WHERE al.user_id = $1 AND ac.is_productive = false ${dateFilter}`,
      params
    );

    // Idle time
    const idleParams = [userId];
    let idleDateFilter = "";
    if (date) {
      idleDateFilter = "AND DATE(start_time) = $2";
      idleParams.push(date);
    } else if (from && to) {
      idleDateFilter = "AND DATE(start_time) BETWEEN $2 AND $3";
      idleParams.push(from, to);
    }
    const idleTime = await pool.query(
      `SELECT COALESCE(SUM(duration), 0) AS total FROM idle_logs WHERE user_id = $1 ${idleDateFilter}`,
      idleParams
    );

    // App breakdown with classification
    const appBreakdown = await pool.query(
      `SELECT al.app_name,
              SUM(al.duration) AS duration,
              COALESCE(ac.category, 'Uncategorized') AS category,
              COALESCE(ac.is_productive, false) AS is_productive
       FROM activity_logs al
       LEFT JOIN app_categories ac ON LOWER(al.app_name) = LOWER(ac.app_name)
       WHERE al.user_id = $1 ${dateFilter}
       GROUP BY al.app_name, ac.category, ac.is_productive
       ORDER BY duration DESC`,
      params
    );

    const total = Number(totalActive.rows[0].total);
    const productive = Number(productiveTime.rows[0].total);
    const unproductive = Number(unproductiveTime.rows[0].total);
    const idle = Number(idleTime.rows[0].total);
    const score = total > 0 ? Math.round((productive / total) * 100) : 0;

    res.json({
      userId: Number(userId),
      score,
      total_active_time: total,
      productive_time: productive,
      unproductive_time: unproductive,
      idle_time: idle,
      uncategorized_time: total - productive - unproductive,
      app_breakdown: appBreakdown.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to calculate productivity" });
  }
};

// Team-wide productivity ranking
const getTeamProductivity = async (req, res) => {
  try {
    const { from, to } = req.query;

    let dateFilter = "";
    const params = [];

    if (from && to) {
      dateFilter = "AND DATE(al.start_time) BETWEEN $1 AND $2";
      params.push(from, to);
    }

    const result = await pool.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         o.name AS organization_name,
         t.name AS team_name,
         d.name AS department_name,
         COALESCE(SUM(al.duration), 0) AS total_active_time,
         COALESCE(SUM(CASE WHEN ac.is_productive = true THEN al.duration ELSE 0 END), 0) AS productive_time,
         COALESCE(SUM(CASE WHEN ac.is_productive = false THEN al.duration ELSE 0 END), 0) AS unproductive_time,
         CASE
           WHEN COALESCE(SUM(al.duration), 0) > 0
           THEN ROUND(
             COALESCE(SUM(CASE WHEN ac.is_productive = true THEN al.duration ELSE 0 END), 0)::numeric
             / COALESCE(SUM(al.duration), 1)::numeric * 100
           )
           ELSE 0
         END AS score
       FROM users u
       LEFT JOIN activity_logs al ON al.user_id = u.id ${dateFilter}
       LEFT JOIN app_categories ac ON LOWER(al.app_name) = LOWER(ac.app_name)
       LEFT JOIN organizations o ON u.organization_id = o.id
       LEFT JOIN teams t ON u.team_id = t.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.role != 'admin'
       GROUP BY u.id, u.name, u.email, o.name, t.name, d.name
       ORDER BY score DESC`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch team productivity" });
  }
};

// Executive summary: org-level productivity aggregates
const getExecutiveAnalytics = async (req, res) => {
  try {
    const { from, to } = req.query;
    let dateFilter = "";
    const params = [];

    if (from && to) {
      dateFilter = "AND DATE(al.start_time) BETWEEN $1 AND $2";
      params.push(from, to);
    }

    const orgStats = await pool.query(
      `SELECT
         o.id,
         o.name AS organization,
         COUNT(DISTINCT u.id) AS headcount,
         COALESCE(SUM(al.duration), 0) AS total_active_time,
         COALESCE(SUM(CASE WHEN ac.is_productive = true THEN al.duration ELSE 0 END), 0) AS productive_time,
         CASE
           WHEN COALESCE(SUM(al.duration), 0) > 0
           THEN ROUND(
             COALESCE(SUM(CASE WHEN ac.is_productive = true THEN al.duration ELSE 0 END), 0)::numeric
             / COALESCE(SUM(al.duration), 1)::numeric * 100
           )
           ELSE 0
         END AS productivity_score
       FROM organizations o
       LEFT JOIN users u ON u.organization_id = o.id AND u.role != 'admin'
       LEFT JOIN activity_logs al ON al.user_id = u.id ${dateFilter}
       LEFT JOIN app_categories ac ON LOWER(al.app_name) = LOWER(ac.app_name)
       GROUP BY o.id, o.name
       ORDER BY productivity_score DESC`,
      params
    );

    const topApps = await pool.query(
      `SELECT al.app_name,
              SUM(al.duration) AS total_duration,
              COALESCE(ac.category, 'Uncategorized') AS category,
              COALESCE(ac.is_productive, false) AS is_productive
       FROM activity_logs al
       LEFT JOIN app_categories ac ON LOWER(al.app_name) = LOWER(ac.app_name)
       ${from && to ? "WHERE DATE(al.start_time) BETWEEN $1 AND $2" : ""}
       GROUP BY al.app_name, ac.category, ac.is_productive
       ORDER BY total_duration DESC
       LIMIT 10`,
      params
    );

    const headlineStats = await pool.query(`
      SELECT
        COUNT(DISTINCT CASE WHEN role != 'admin' THEN id END) AS total_employees,
        COUNT(DISTINCT CASE WHEN status = 'Online' THEN id END) AS online_now,
        COUNT(DISTINCT CASE WHEN role = 'manager' THEN id END) AS total_managers
      FROM users
    `);

    res.json({
      headline: headlineStats.rows[0],
      by_organization: orgStats.rows,
      top_apps: topApps.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch executive analytics" });
  }
};

// Manager: view productivity of their team (by department)
const getManagerTeamProductivity = async (req, res) => {
  try {
    const managerId = req.user.id;
    const { from, to } = req.query;

    // Find departments managed by this user
    const depts = await pool.query("SELECT id FROM departments WHERE manager_id = $1", [managerId]);
    const deptIds = depts.rows.map((r) => r.id);

    if (deptIds.length === 0) {
      return res.json([]);
    }

    let dateFilter = "";
    const params = [deptIds];

    if (from && to) {
      dateFilter = "AND DATE(al.start_time) BETWEEN $2 AND $3";
      params.push(from, to);
    }

    const result = await pool.query(
      `SELECT
         u.id, u.name, u.email, u.status,
         d.name AS department_name,
         COALESCE(SUM(al.duration), 0) AS total_active_time,
         COALESCE(SUM(CASE WHEN ac.is_productive = true THEN al.duration ELSE 0 END), 0) AS productive_time,
         CASE
           WHEN COALESCE(SUM(al.duration), 0) > 0
           THEN ROUND(
             COALESCE(SUM(CASE WHEN ac.is_productive = true THEN al.duration ELSE 0 END), 0)::numeric
             / COALESCE(SUM(al.duration), 1)::numeric * 100
           )
           ELSE 0
         END AS score
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN activity_logs al ON al.user_id = u.id ${dateFilter}
       LEFT JOIN app_categories ac ON LOWER(al.app_name) = LOWER(ac.app_name)
       WHERE u.department_id = ANY($1) AND u.role != 'admin'
       GROUP BY u.id, u.name, u.email, u.status, d.name
       ORDER BY score DESC`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch manager team data" });
  }
};

module.exports = { getUserProductivity, getTeamProductivity, getExecutiveAnalytics, getManagerTeamProductivity };
