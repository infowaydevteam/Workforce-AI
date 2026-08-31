const pool = require("../db");

const getDashboardStats = async (req, res) => {
  try {
    console.log("========== DASHBOARD STATS ==========");
    console.log("REQ.USER:", req.user);

    const role = String(req.user?.role || "").toLowerCase();

    // JWT me jo bhi ID field hai usko support karega
    const userId =
      req.user?.id ??
      req.user?.user_id ??
      req.user?.userId;

    console.log("ROLE:", role);
    console.log("USER ID:", userId);

    // =====================================================
    // SUPERADMIN
    // =====================================================
    if (role === "superadmin") {
      const result = await pool.query(`
        SELECT
          (SELECT COUNT(*)
           FROM users
           WHERE role != 'superadmin')::int AS total_users,

          (SELECT COUNT(*)
           FROM organizations)::int AS total_organizations,

          (SELECT COUNT(*)
           FROM teams)::int AS total_teams,

          (SELECT COUNT(*)
           FROM users
           WHERE role != 'superadmin'
           AND LOWER(COALESCE(status, '')) = 'online')::int AS online_users,

          (SELECT COUNT(*)
           FROM users
           WHERE role != 'superadmin'
           AND LOWER(COALESCE(status, '')) = 'idle')::int AS idle_users,

          (SELECT COUNT(*)
           FROM users
           WHERE role != 'superadmin'
           AND LOWER(COALESCE(status, '')) = 'offline')::int AS offline_users
      `);

      const data = result.rows[0];

      return res.json({
        success: true,
        totalUsers: data.total_users,
        totalOrganizations: data.total_organizations,
        totalTeams: data.total_teams,
        onlineUsers: data.online_users,
        idleUsers: data.idle_users,
        offlineUsers: data.offline_users,
      });
    }

    // =====================================================
    // ADMIN
    // =====================================================
    if (role === "admin") {

      if (!userId) {
        console.log("USER ID NOT FOUND IN TOKEN");

        return res.status(400).json({
          success: false,
          message: "User ID not found in token",
        });
      }

      // ---------------------------------------------------
      // Admin ki organization DB se nikalo
      // ---------------------------------------------------
      const adminResult = await pool.query(
        `
        SELECT
          id,
          role,
          organization_id
        FROM users
        WHERE id = $1
        `,
        [userId]
      );

      console.log("ADMIN DB RESULT:", adminResult.rows);

      if (adminResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Admin user not found",
        });
      }

      const organizationId = adminResult.rows[0].organization_id;

      console.log("ORGANIZATION ID:", organizationId);

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Admin is not assigned to any organization",
        });
      }

      // ---------------------------------------------------
      // Organization-wise dashboard
      // ---------------------------------------------------
      const result = await pool.query(
        `
        SELECT

          (
            SELECT COUNT(*)
            FROM users
            WHERE organization_id = $1
            AND role != 'superadmin'
          )::int AS total_users,

          (
            SELECT COUNT(*)
            FROM organizations
            WHERE id = $1
          )::int AS total_organizations,

          (
            SELECT COUNT(*)
            FROM teams
            WHERE organization_id = $1
          )::int AS total_teams,

          (
            SELECT COUNT(*)
            FROM users
            WHERE organization_id = $1
            AND role != 'superadmin'
            AND LOWER(COALESCE(status, '')) = 'online'
          )::int AS online_users,

          (
            SELECT COUNT(*)
            FROM users
            WHERE organization_id = $1
            AND role != 'superadmin'
            AND LOWER(COALESCE(status, '')) = 'idle'
          )::int AS idle_users,

          (
            SELECT COUNT(*)
            FROM users
            WHERE organization_id = $1
            AND role != 'superadmin'
            AND LOWER(COALESCE(status, '')) = 'offline'
          )::int AS offline_users
        `,
        [organizationId]
      );

      const data = result.rows[0];

      console.log("ADMIN DASHBOARD DATA:", data);

      return res.json({
        success: true,
        totalUsers: data.total_users,
        totalOrganizations: data.total_organizations,
        totalTeams: data.total_teams,
        onlineUsers: data.online_users,
        idleUsers: data.idle_users,
        offlineUsers: data.offline_users,
      });
    }

    // =====================================================
    // INVALID ROLE
    // =====================================================
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });

  } catch (error) {
    console.error("Dashboard Stats Error:", error);

    return res.status(500).json({
      success: false,
      message: "Dashboard stats error",
      error: error.message,
    });

  }
};

const getRecentActivities = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();

    const userId =
      req.user?.id ??
      req.user?.user_id ??
      req.user?.userId;

    console.log("========== RECENT ACTIVITIES ==========");
    console.log("REQ.USER:", req.user);
    console.log("ROLE:", role);
    console.log("USER ID:", userId);

    let query = `
      SELECT
        u.id AS user_id,
        u.name AS user_name,
        a.app_name,
        a.start_time,
        a.end_time
      FROM activity_logs a
      INNER JOIN users u
        ON a.user_id = u.id
    `;

    let values = [];

    // ==========================================
    // ADMIN
    // ==========================================
    if (role === "admin") {

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID not found in token",
        });
      }

      const adminResult = await pool.query(
        `
        SELECT organization_id
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

      const organizationId = adminResult.rows[0].organization_id;

      console.log("ADMIN ORGANIZATION ID:", organizationId);

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Admin is not assigned to any organization",
        });
      }

      query += `
        WHERE u.organization_id = $1
      `;

      values.push(organizationId);
    }

    // ==========================================
    // SUPERADMIN
    // ==========================================
    // Superadmin ke liye organization filter nahi lagega.

    query += `
      ORDER BY a.start_time DESC
      LIMIT 10
    `);

    console.log(pool.constructor.name);
    console.log(result.rows);

    console.log("RECENT ACTIVITIES COUNT:", result.rows.length);

    return res.json(result.rows);

  } catch (err) {
    console.error("RECENT ACTIVITY ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Activity fetch error",
      error: err.message,
    });
  }
};

const getLiveUsers = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();

    const userId =
      req.user?.id ??
      req.user?.user_id ??
      req.user?.userId;

    console.log("========== LIVE USERS ==========");
    console.log("REQ.USER:", req.user);
    console.log("ROLE:", role);
    console.log("USER ID:", userId);

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

    // ==========================================
    // ADMIN
    // ==========================================
    if (role === "admin") {

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID not found in token",
        });
      }

      const adminResult = await pool.query(
        `
        SELECT organization_id
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

      const organizationId = adminResult.rows[0].organization_id;

      console.log("ADMIN ORGANIZATION ID:", organizationId);

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Admin is not assigned to any organization",
        });
      }

      query += `
        AND users.organization_id = $1
        AND users.role != 'admin'
      `;

      values.push(organizationId);
    }

    // ==========================================
    // SUPERADMIN
    // ==========================================
    // Superadmin ko sabhi organizations ke users milenge.

    query += `
      ORDER BY users.name ASC
    `);

    console.log("LIVE USERS COUNT:", result.rows.length);

    return res.json(result.rows);

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Live users fetch error",
      error: err.message,
    });
  }
};

const getOrganizationSummary = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();

    const userId =
      req.user?.id ??
      req.user?.user_id ??
      req.user?.userId;

    console.log("========== ORGANIZATION SUMMARY ==========");
    console.log("REQ.USER:", req.user);
    console.log("ROLE:", role);
    console.log("USER ID:", userId);

    let query = `
      SELECT
        o.id,
        o.name,
        COUNT(u.id)::int AS employee_count
      FROM organizations o
      LEFT JOIN users u
        ON u.organization_id = o.id
        AND u.role != 'superadmin'
    `;

    let values = [];

    // ==========================================
    // ADMIN
    // ==========================================
    if (role === "admin") {

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID not found in token",
        });
      }

      // Admin ki organization DB se nikalo
      const adminResult = await pool.query(
        `
        SELECT organization_id
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

      const organizationId = adminResult.rows[0].organization_id;

      console.log("ADMIN ORGANIZATION ID:", organizationId);

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Admin is not assigned to any organization",
        });
      }

      query += `
        WHERE o.id = $1
      `;

      values.push(organizationId);
    }

    // ==========================================
    // SUPERADMIN
    // ==========================================
    // Superadmin ke liye WHERE nahi lagega,
    // isliye sabhi organizations aayengi.

    query += `
      GROUP BY o.id, o.name
      ORDER BY employee_count DESC
    `);

    console.log("ORGANIZATION SUMMARY:", result.rows);

    return res.json(result.rows);

  } catch (err) {
    console.error("ORGANIZATION SUMMARY ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Organization summary error",
      error: err.message,
    });
  }
};

const getTopApplicationsToday = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();

    const userId =
      req.user?.id ??
      req.user?.user_id ??
      req.user?.userId;

    console.log("========== TOP APPLICATIONS TODAY ==========");
    console.log("REQ.USER:", req.user);
    console.log("ROLE:", role);
    console.log("USER ID:", userId);

    let query = `
      SELECT
        a.app_name,
        COALESCE(SUM(a.duration), 0)::bigint AS total_duration
      FROM activity_logs a
      INNER JOIN users u
        ON a.user_id = u.id
      WHERE DATE(a.start_time) = CURRENT_DATE
    `;

    let values = [];

    // ==========================================
    // ADMIN
    // ==========================================
    if (role === "admin") {

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID not found in token",
        });
      }

      // Admin ki organization DB se nikalo
      const adminResult = await pool.query(
        `
        SELECT organization_id
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

      const organizationId = adminResult.rows[0].organization_id;

      console.log("ADMIN ORGANIZATION ID:", organizationId);

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Admin is not assigned to any organization",
        });
      }

      query += `
        AND u.organization_id = $1
      `;

      values.push(organizationId);
    }

    // ==========================================
    // SUPERADMIN
    // ==========================================
    // Superadmin ke liye organization filter nahi lagega.

    query += `
      GROUP BY a.app_name
      ORDER BY total_duration DESC
      LIMIT 10
    `;

    console.log("TOP APPS QUERY:", query);
    console.log("TOP APPS VALUES:", values);

    const result = await pool.query(query, values);

    console.log("TOP APPS RESULT:", result.rows);

    return res.json(result.rows);

  } catch (err) {
    console.error("TOP APPLICATIONS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Top applications error",
      error: err.message,
    });
  }
};

module.exports = { getDashboardStats, getRecentActivities, getLiveUsers, getOrganizationSummary, getTopApplicationsToday };
