const bcrypt = require("bcrypt");
const crypto = require("crypto");
const pool = require("../db");
const {
  calculateProductivityScore,
  classifyActivity,
} = require("../services/level1Service");

const demoPassword = "Demo@1234";

const toSlug = (value = "") =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const toNullableNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return Number(value);
};

const getStatusSnapshot = async () => {
  const metricsResult = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM organizations) AS tenant_count,
      (SELECT COUNT(*)::int FROM organizations WHERE COALESCE(setup_status, '') != '') AS configured_organizations,
      (SELECT COUNT(*)::int FROM departments) AS department_count,
      (SELECT COUNT(*)::int FROM teams) AS team_count,
      (SELECT COUNT(*)::int FROM users WHERE role = 'manager') AS manager_count,
      (SELECT COUNT(*)::int FROM users WHERE role = 'hr') AS hr_count,
      (SELECT COUNT(*)::int FROM users WHERE role = 'executive') AS executive_count,
      (SELECT COUNT(*)::int FROM users WHERE role != 'admin') AS workforce_count,
      (SELECT COUNT(*)::int FROM users WHERE manager_id IS NOT NULL) AS manager_assignment_count,
      (SELECT COUNT(*)::int FROM users WHERE invitation_status IN ('invited', 'accepted', 'active')) AS invited_count,
      (SELECT COUNT(*)::int FROM users WHERE agent_installed_at IS NOT NULL) AS agent_installed_count,
      (SELECT COUNT(*)::int FROM sessions) AS session_count,
      (SELECT COUNT(*)::int FROM activity_logs) AS activity_count,
      (SELECT COUNT(*)::int FROM activity_logs WHERE COALESCE(activity_category, '') != '') AS classified_activity_count,
      (SELECT COUNT(*)::int FROM report_reviews WHERE reviewer_role = 'manager') AS manager_review_count,
      (SELECT COUNT(*)::int FROM report_reviews WHERE reviewer_role = 'hr') AS hr_review_count
  `);

  const productivityResult = await pool.query(`
    SELECT
      COALESCE(SUM(duration), 0)::float AS active_seconds,
      COALESCE(SUM(duration * (COALESCE(productivity_score, 50) / 100.0)), 0)::float AS weighted_seconds
    FROM activity_logs
  `);

  const idleResult = await pool.query(`
    SELECT COALESCE(SUM(duration), 0)::float AS idle_seconds
    FROM idle_logs
  `);

  const metrics = metricsResult.rows[0];
  const activeSeconds = Number(productivityResult.rows[0].active_seconds || 0);
  const idleSeconds = Number(idleResult.rows[0].idle_seconds || 0);
  const productivityScore = calculateProductivityScore({
    weightedSeconds: productivityResult.rows[0].weighted_seconds,
    measuredSeconds: activeSeconds + idleSeconds,
  });

  const steps = [
    {
      key: "company_signup",
      label: "Company Signup",
      complete: metrics.tenant_count > 0,
      metric: `${metrics.tenant_count} tenant${metrics.tenant_count === 1 ? "" : "s"}`,
    },
    {
      key: "tenant_creation",
      label: "Tenant Creation",
      complete: metrics.tenant_count > 0,
      metric: `${metrics.tenant_count} organization record${metrics.tenant_count === 1 ? "" : "s"}`,
    },
    {
      key: "organization_setup",
      label: "Organization Setup",
      complete: metrics.configured_organizations > 0,
      metric: `${metrics.configured_organizations} configured`,
    },
    {
      key: "departments_creation",
      label: "Departments Creation",
      complete: metrics.department_count > 0,
      metric: `${metrics.department_count} departments`,
    },
    {
      key: "teams_creation",
      label: "Teams Creation",
      complete: metrics.team_count > 0,
      metric: `${metrics.team_count} teams`,
    },
    {
      key: "managers_assigned",
      label: "Managers Assigned",
      complete: metrics.manager_count > 0 && metrics.manager_assignment_count > 0,
      metric: `${metrics.manager_count} managers / ${metrics.manager_assignment_count} assignments`,
    },
    {
      key: "employees_invited",
      label: "Employees Invited",
      complete: metrics.invited_count > 0,
      metric: `${metrics.invited_count} invited users`,
    },
    {
      key: "desktop_agent_installed",
      label: "Desktop Agent Installed",
      complete: metrics.agent_installed_count > 0,
      metric: `${metrics.agent_installed_count} installs`,
    },
    {
      key: "user_login",
      label: "User Login",
      complete: metrics.session_count > 0,
      metric: `${metrics.session_count} sessions`,
    },
    {
      key: "activity_collection",
      label: "Activity Collection",
      complete: metrics.activity_count > 0,
      metric: `${metrics.activity_count} activity logs`,
    },
    {
      key: "data_sync",
      label: "Data Sync",
      complete: metrics.activity_count > 0 && metrics.session_count > 0,
      metric: `${metrics.activity_count + metrics.session_count} synced events`,
    },
    {
      key: "activity_classification",
      label: "Activity Classification",
      complete: metrics.classified_activity_count > 0,
      metric: `${metrics.classified_activity_count} classified logs`,
    },
    {
      key: "productivity_calculation",
      label: "Productivity Calculation",
      complete: productivityScore > 0,
      metric: `${productivityScore}% score`,
    },
    {
      key: "reports_generation",
      label: "Reports Generation",
      complete: metrics.activity_count > 0 && productivityScore > 0,
      metric: "Employee report ready",
    },
    {
      key: "manager_review",
      label: "Manager Review",
      complete: metrics.manager_review_count > 0,
      metric: `${metrics.manager_review_count} manager reviews`,
    },
    {
      key: "hr_review",
      label: "HR Review",
      complete: metrics.hr_review_count > 0,
      metric: `${metrics.hr_review_count} HR reviews`,
    },
    {
      key: "executive_analytics",
      label: "Executive Analytics",
      complete:
        metrics.executive_count > 0 &&
        metrics.tenant_count > 0 &&
        metrics.activity_count > 0,
      metric: `${metrics.executive_count} executive users`,
    },
  ];

  return {
    metrics: {
      ...metrics,
      active_seconds: activeSeconds,
      idle_seconds: idleSeconds,
      productivity_score: productivityScore,
    },
    progress: {
      completed: steps.filter((step) => step.complete).length,
      total: steps.length,
    },
    steps,
  };
};

const getLevel1Status = async (req, res) => {
  try {
    const snapshot = await getStatusSnapshot();
    res.json(snapshot);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch Level 1 status" });
  }
};

const getDepartments = async (req, res) => {
  try {
    const { organization_id } = req.query;
    const params = [];

    let filter = "";
    if (organization_id) {
      params.push(organization_id);
      filter = "WHERE d.organization_id = $1";
    }

    const result = await pool.query(
      `
      SELECT
        d.id,
        d.name,
        d.description,
        d.organization_id,
        o.name AS organization_name,
        COUNT(u.id)::int AS employee_count
      FROM departments d
      LEFT JOIN organizations o ON o.id = d.organization_id
      LEFT JOIN users u ON u.department_id = d.id AND u.role != 'admin'
      ${filter}
      GROUP BY d.id, o.name
      ORDER BY d.id DESC
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch departments" });
  }
};

const addDepartment = async (req, res) => {
  try {
    const { name, organization_id, description } = req.body;

    if (!name || !organization_id) {
      return res.status(400).json({
        message: "Department name and organization are required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO departments (name, organization_id, description)
      VALUES ($1, $2, $3)
      ON CONFLICT (organization_id, name)
      DO UPDATE SET description = EXCLUDED.description
      RETURNING *
      `,
      [name, organization_id, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add department" });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    await pool.query("DELETE FROM departments WHERE id = $1", [req.params.id]);
    res.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete department" });
  }
};

const signupCompany = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      company_name,
      company_domain,
      admin_name,
      admin_email,
      admin_password,
      description,
    } = req.body;

    if (!company_name || !admin_name || !admin_email || !admin_password) {
      return res.status(400).json({
        message: "Company name and admin credentials are required",
      });
    }

    const tenantSlug = toSlug(req.body.tenant_slug || company_name);
    const hashedPassword = await bcrypt.hash(admin_password, 10);

    await client.query("BEGIN");

    const organization = await client.query(
      `
      INSERT INTO organizations
        (name, description, tenant_slug, company_domain, setup_status)
      VALUES ($1, $2, $3, $4, 'active')
      ON CONFLICT (tenant_slug) WHERE tenant_slug IS NOT NULL
      DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        company_domain = EXCLUDED.company_domain,
        setup_status = 'active'
      RETURNING *
      `,
      [
        company_name,
        description || "Created through Level 1 company signup",
        tenantSlug,
        company_domain || null,
      ]
    );

    const admin = await client.query(
      `
      INSERT INTO users
        (name, email, password, role, organization_id, agent_token, invitation_status, invited_at)
      VALUES ($1, $2, $3, 'admin', $4, $5, 'active', NOW())
      ON CONFLICT (email)
      DO UPDATE SET
        name = EXCLUDED.name,
        password = EXCLUDED.password,
        role = 'admin',
        organization_id = EXCLUDED.organization_id,
        invitation_status = 'active'
      RETURNING id, name, email, role, organization_id
      `,
      [
        admin_name,
        admin_email,
        hashedPassword,
        organization.rows[0].id,
        crypto.randomUUID(),
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      organization: organization.rows[0],
      admin: admin.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Failed to complete company signup" });
  } finally {
    client.release();
  }
};

const inviteEmployee = async (req, res) => {
  try {
    const {
      name,
      email,
      role = "employee",
      organization_id,
      department_id,
      team_id,
      manager_id,
      password,
    } = req.body;

    if (!name || !email || !organization_id) {
      return res.status(400).json({
        message: "Name, email and organization are required",
      });
    }

    const hashedPassword = await bcrypt.hash(password || "Temp@1234", 10);
    const agentToken = crypto.randomUUID();

    const result = await pool.query(
      `
      INSERT INTO users
        (
          name,
          email,
          password,
          role,
          organization_id,
          department_id,
          team_id,
          manager_id,
          invitation_status,
          invited_at,
          agent_token
        )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'invited',NOW(),$9)
      RETURNING
        id,
        name,
        email,
        role,
        organization_id,
        department_id,
        team_id,
        manager_id,
        invitation_status,
        agent_token
      `,
      [
        name,
        email,
        hashedPassword,
        role,
        organization_id,
        toNullableNumber(department_id),
        toNullableNumber(team_id),
        toNullableNumber(manager_id),
        agentToken,
      ]
    );

    res.status(201).json({
      message: "Employee invited successfully",
      user: result.rows[0],
      invite: {
        temporary_password: password || "Temp@1234",
        agent_download_url: `/api/agent/download-agent/${agentToken}`,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to invite employee" });
  }
};

const assignManager = async (req, res) => {
  const client = await pool.connect();

  try {
    const { team_id, manager_id } = req.body;

    if (!team_id || !manager_id) {
      return res.status(400).json({
        message: "Team and manager are required",
      });
    }

    await client.query("BEGIN");

    await client.query(
      "UPDATE users SET role = 'manager' WHERE id = $1",
      [manager_id]
    );

    const team = await client.query(
      `
      UPDATE teams
      SET manager_id = $1
      WHERE id = $2
      RETURNING *
      `,
      [manager_id, team_id]
    );

    const employees = await client.query(
      `
      UPDATE users
      SET manager_id = $1
      WHERE team_id = $2 AND role = 'employee'
      RETURNING id, name, email
      `,
      [manager_id, team_id]
    );

    await client.query("COMMIT");

    res.json({
      team: team.rows[0],
      assigned_employees: employees.rows,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Failed to assign manager" });
  } finally {
    client.release();
  }
};

const markAgentInstalled = async (req, res) => {
  try {
    const { user_id, agent_token } = req.body;

    if (!user_id && !agent_token) {
      return res.status(400).json({
        message: "User id or agent token is required",
      });
    }

    const params = [];
    let filter = "";

    if (user_id) {
      params.push(user_id);
      filter = "id = $1";
    } else {
      params.push(agent_token);
      filter = "agent_token = $1";
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        agent_installed_at = COALESCE(agent_installed_at, NOW()),
        invitation_status = 'accepted',
        status = 'Online',
        last_active = NOW()
      WHERE ${filter}
      RETURNING id, name, email, agent_installed_at, invitation_status
      `,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Agent user not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to mark agent installed" });
  }
};

const createReview = async (req, res) => {
  try {
    const {
      subject_user_id,
      reviewer_role,
      report_scope = "employee",
      status = "approved",
      notes,
    } = req.body;

    if (!subject_user_id || !reviewer_role) {
      return res.status(400).json({
        message: "Subject user and reviewer role are required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO report_reviews
        (report_scope, subject_user_id, reviewer_id, reviewer_role, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        report_scope,
        subject_user_id,
        req.user?.id || null,
        reviewer_role,
        status,
        notes || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create review" });
  }
};

const getExecutiveAnalytics = async (req, res) => {
  try {
    const [status, byOrganization, byDepartment, topApplications, reviews] =
      await Promise.all([
        getStatusSnapshot(),
        pool.query(`
          SELECT
            o.id,
            o.name,
            COUNT(DISTINCT u.id)::int AS employee_count,
            COALESCE(SUM(a.duration), 0)::int AS active_seconds,
            ROUND(COALESCE(AVG(a.productivity_score), 0))::int AS average_productivity
          FROM organizations o
          LEFT JOIN users u
            ON u.organization_id = o.id
            AND u.role != 'admin'
          LEFT JOIN activity_logs a ON a.user_id = u.id
          GROUP BY o.id, o.name
          ORDER BY employee_count DESC, o.name ASC
        `),
        pool.query(`
          SELECT
            d.id,
            d.name,
            o.name AS organization_name,
            COUNT(DISTINCT u.id)::int AS employee_count,
            COALESCE(SUM(a.duration), 0)::int AS active_seconds,
            ROUND(COALESCE(AVG(a.productivity_score), 0))::int AS average_productivity
          FROM departments d
          LEFT JOIN organizations o ON o.id = d.organization_id
          LEFT JOIN users u
            ON u.department_id = d.id
            AND u.role != 'admin'
          LEFT JOIN activity_logs a ON a.user_id = u.id
          GROUP BY d.id, d.name, o.name
          ORDER BY employee_count DESC, d.name ASC
        `),
        pool.query(`
          SELECT
            app_name,
            activity_category,
            SUM(duration)::int AS total_duration,
            ROUND(AVG(productivity_score))::int AS average_productivity
          FROM activity_logs
          GROUP BY app_name, activity_category
          ORDER BY total_duration DESC
          LIMIT 10
        `),
        pool.query(`
          SELECT
            r.id,
            r.report_scope,
            r.reviewer_role,
            r.status,
            r.notes,
            r.reviewed_at,
            subject.name AS subject_name,
            reviewer.name AS reviewer_name
          FROM report_reviews r
          LEFT JOIN users subject ON subject.id = r.subject_user_id
          LEFT JOIN users reviewer ON reviewer.id = r.reviewer_id
          ORDER BY r.reviewed_at DESC
          LIMIT 20
        `),
      ]);

    res.json({
      overview: status,
      byOrganization: byOrganization.rows,
      byDepartment: byDepartment.rows,
      topApplications: topApplications.rows,
      reviews: reviews.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch executive analytics" });
  }
};

const getOrCreateTeam = async (client, { name, organizationId, departmentId }) => {
  const existing = await client.query(
    `
    SELECT *
    FROM teams
    WHERE organization_id = $1 AND name = $2
    ORDER BY id ASC
    LIMIT 1
    `,
    [organizationId, name]
  );

  if (existing.rows.length > 0) {
    const updated = await client.query(
      `
      UPDATE teams
      SET department_id = $1
      WHERE id = $2
      RETURNING *
      `,
      [departmentId, existing.rows[0].id]
    );

    return updated.rows[0];
  }

  const created = await client.query(
    `
    INSERT INTO teams (name, organization_id, department_id)
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [name, organizationId, departmentId]
  );

  return created.rows[0];
};

const upsertDemoUser = async (client, user) => {
  const hashedPassword = await bcrypt.hash(demoPassword, 10);

  const result = await client.query(
    `
    INSERT INTO users
      (
        name,
        email,
        password,
        role,
        organization_id,
        department_id,
        team_id,
        manager_id,
        status,
        last_active,
        agent_token,
        invitation_status,
        invited_at,
        agent_installed_at
      )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),$10,$11,NOW(),$12)
    ON CONFLICT (email)
    DO UPDATE SET
      name = EXCLUDED.name,
      password = EXCLUDED.password,
      role = EXCLUDED.role,
      organization_id = EXCLUDED.organization_id,
      department_id = EXCLUDED.department_id,
      team_id = EXCLUDED.team_id,
      manager_id = EXCLUDED.manager_id,
      status = EXCLUDED.status,
      last_active = NOW(),
      agent_token = COALESCE(users.agent_token, EXCLUDED.agent_token),
      invitation_status = EXCLUDED.invitation_status,
      agent_installed_at = EXCLUDED.agent_installed_at
    RETURNING id, name, email, role, organization_id, department_id, team_id, manager_id, agent_token
    `,
    [
      user.name,
      user.email,
      hashedPassword,
      user.role,
      user.organization_id,
      user.department_id || null,
      user.team_id || null,
      user.manager_id || null,
      user.status || "Offline",
      crypto.randomUUID(),
      user.invitation_status || "accepted",
      user.agent_installed_at || null,
    ]
  );

  return result.rows[0];
};

const insertActivity = async (client, { userId, appName, startedMinutesAgo, durationMinutes }) => {
  const end = new Date(Date.now() - startedMinutesAgo * 60 * 1000);
  const start = new Date(end.getTime() - durationMinutes * 60 * 1000);
  const duration = durationMinutes * 60;
  const classification = classifyActivity(appName);

  await client.query(
    `
    INSERT INTO activity_logs
      (user_id, app_name, start_time, end_time, duration, activity_category, productivity_score)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    `,
    [
      userId,
      appName,
      start,
      end,
      duration,
      classification.activity_category,
      classification.productivity_score,
    ]
  );
};

const seedLevel1Demo = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const organization = await client.query(
      `
      INSERT INTO organizations
        (name, description, tenant_slug, company_domain, setup_status)
      VALUES
        ('Acme Workforce Demo', 'Demo tenant for the complete Level 1 platform flow', 'acme-workforce-demo', 'acme.example', 'active')
      ON CONFLICT (tenant_slug) WHERE tenant_slug IS NOT NULL
      DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        company_domain = EXCLUDED.company_domain,
        setup_status = 'active'
      RETURNING *
      `
    );

    const organizationId = organization.rows[0].id;

    const engineering = await client.query(
      `
      INSERT INTO departments (name, organization_id, description)
      VALUES ('Engineering', $1, 'Product and platform delivery')
      ON CONFLICT (organization_id, name)
      DO UPDATE SET description = EXCLUDED.description
      RETURNING *
      `,
      [organizationId]
    );

    const operations = await client.query(
      `
      INSERT INTO departments (name, organization_id, description)
      VALUES ('Operations', $1, 'Customer operations and delivery quality')
      ON CONFLICT (organization_id, name)
      DO UPDATE SET description = EXCLUDED.description
      RETURNING *
      `,
      [organizationId]
    );

    const platformTeam = await getOrCreateTeam(client, {
      name: "Platform Ops",
      organizationId,
      departmentId: engineering.rows[0].id,
    });

    const supportTeam = await getOrCreateTeam(client, {
      name: "Customer Support",
      organizationId,
      departmentId: operations.rows[0].id,
    });

    const admin = await upsertDemoUser(client, {
      name: "Admin Demo",
      email: "admin.demo@acme.example",
      role: "admin",
      organization_id: organizationId,
      status: "Online",
      invitation_status: "active",
    });

    const manager = await upsertDemoUser(client, {
      name: "Maya Manager",
      email: "manager.demo@acme.example",
      role: "manager",
      organization_id: organizationId,
      department_id: engineering.rows[0].id,
      team_id: platformTeam.id,
      status: "Online",
      agent_installed_at: new Date(),
    });

    const hr = await upsertDemoUser(client, {
      name: "Harper HR",
      email: "hr.demo@acme.example",
      role: "hr",
      organization_id: organizationId,
      department_id: operations.rows[0].id,
      team_id: supportTeam.id,
      status: "Online",
      invitation_status: "active",
    });

    const executive = await upsertDemoUser(client, {
      name: "Evan Executive",
      email: "executive.demo@acme.example",
      role: "executive",
      organization_id: organizationId,
      status: "Online",
      invitation_status: "active",
    });

    const employeeOne = await upsertDemoUser(client, {
      name: "Ava Analyst",
      email: "ava.employee@acme.example",
      role: "employee",
      organization_id: organizationId,
      department_id: engineering.rows[0].id,
      team_id: platformTeam.id,
      manager_id: manager.id,
      status: "Online",
      agent_installed_at: new Date(),
    });

    const employeeTwo = await upsertDemoUser(client, {
      name: "Ben Builder",
      email: "ben.employee@acme.example",
      role: "employee",
      organization_id: organizationId,
      department_id: operations.rows[0].id,
      team_id: supportTeam.id,
      manager_id: manager.id,
      status: "Idle",
      agent_installed_at: new Date(),
    });

    await client.query(
      `
      UPDATE teams
      SET manager_id = $1
      WHERE id IN ($2, $3)
      `,
      [manager.id, platformTeam.id, supportTeam.id]
    );

    const demoUserIds = [
      admin.id,
      manager.id,
      hr.id,
      executive.id,
      employeeOne.id,
      employeeTwo.id,
    ];

    await client.query("DELETE FROM report_reviews WHERE subject_user_id = ANY($1::int[])", [
      demoUserIds,
    ]);
    await client.query("DELETE FROM activity_logs WHERE user_id = ANY($1::int[])", [
      demoUserIds,
    ]);
    await client.query("DELETE FROM idle_logs WHERE user_id = ANY($1::int[])", [
      demoUserIds,
    ]);
    await client.query("DELETE FROM sessions WHERE user_id = ANY($1::int[])", [
      demoUserIds,
    ]);

    const sessionStart = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const sessionEnd = new Date(Date.now() - 20 * 60 * 1000);

    for (const user of [manager, employeeOne, employeeTwo]) {
      await client.query(
        `
        INSERT INTO sessions (user_id, login_time, logout_time, total_duration)
        VALUES ($1, $2, $3, $4)
        `,
        [user.id, sessionStart, sessionEnd, 16800]
      );
    }

    await insertActivity(client, {
      userId: employeeOne.id,
      appName: "Visual Studio Code",
      startedMinutesAgo: 250,
      durationMinutes: 95,
    });
    await insertActivity(client, {
      userId: employeeOne.id,
      appName: "GitHub",
      startedMinutesAgo: 150,
      durationMinutes: 45,
    });
    await insertActivity(client, {
      userId: employeeOne.id,
      appName: "Slack",
      startedMinutesAgo: 95,
      durationMinutes: 25,
    });
    await insertActivity(client, {
      userId: employeeTwo.id,
      appName: "Zendesk",
      startedMinutesAgo: 235,
      durationMinutes: 70,
    });
    await insertActivity(client, {
      userId: employeeTwo.id,
      appName: "YouTube",
      startedMinutesAgo: 150,
      durationMinutes: 20,
    });
    await insertActivity(client, {
      userId: manager.id,
      appName: "Google Meet",
      startedMinutesAgo: 125,
      durationMinutes: 35,
    });

    await client.query(
      `
      INSERT INTO idle_logs (user_id, start_time, end_time, duration)
      VALUES
        ($1, NOW() - INTERVAL '80 minutes', NOW() - INTERVAL '65 minutes', 900),
        ($2, NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '30 minutes', 900)
      `,
      [employeeOne.id, employeeTwo.id]
    );

    await client.query(
      `
      INSERT INTO report_reviews
        (report_scope, subject_user_id, reviewer_id, reviewer_role, status, notes)
      VALUES
        ('employee', $1, $2, 'manager', 'approved', 'Manager reviewed Level 1 productivity report.'),
        ('employee', $1, $3, 'hr', 'approved', 'HR reviewed attendance and activity summary.')
      `,
      [employeeOne.id, manager.id, hr.id]
    );

    await client.query("COMMIT");

    const status = await getStatusSnapshot();

    res.status(201).json({
      message: "Level 1 demo data is ready",
      organization: organization.rows[0],
      credentials: [
        { role: "admin", email: admin.email, password: demoPassword },
        { role: "manager", email: manager.email, password: demoPassword },
        { role: "hr", email: hr.email, password: demoPassword },
        { role: "executive", email: executive.email, password: demoPassword },
        { role: "employee", email: employeeOne.email, password: demoPassword },
      ],
      status,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Failed to seed Level 1 demo" });
  } finally {
    client.release();
  }
};

module.exports = {
  addDepartment,
  assignManager,
  createReview,
  deleteDepartment,
  getDepartments,
  getExecutiveAnalytics,
  getLevel1Status,
  inviteEmployee,
  markAgentInstalled,
  seedLevel1Demo,
  signupCompany,
};
