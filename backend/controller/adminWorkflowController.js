const pool = require("../db");

const DEFAULT_PRODUCTIVITY_RULES = [
  { rule_type: "app", pattern: "VS Code", category: "productive" },
  { rule_type: "site", pattern: "GitHub", category: "productive" },
  { rule_type: "site", pattern: "Instagram", category: "unproductive" },
  { rule_type: "site", pattern: "YouTube", category: "neutral" },
];

const ensureOrganizationDefaults = async (organizationId) => {
  await pool.query(
    `INSERT INTO attendance_rules (organization_id)
     VALUES ($1)
     ON CONFLICT (organization_id) DO NOTHING`,
    [organizationId]
  );

  await pool.query(
    `INSERT INTO monitoring_policies (organization_id)
     VALUES ($1)
     ON CONFLICT (organization_id) DO NOTHING`,
    [organizationId]
  );

  for (const rule of DEFAULT_PRODUCTIVITY_RULES) {
    await pool.query(
      `INSERT INTO productivity_rules
       (organization_id, rule_type, pattern, category)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id, rule_type, pattern) DO NOTHING`,
      [organizationId, rule.rule_type, rule.pattern, rule.category]
    );
  }
};

const getSubscriptionPlans = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, max_employees, price_monthly
       FROM subscription_plans
       ORDER BY id ASC`
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch subscription plans" });
  }
};

const getOrganizationSetup = async (req, res) => {
  try {
    const { organizationId } = req.params;

    await ensureOrganizationDefaults(organizationId);

    const organization = await pool.query(
      `SELECT
         o.id,
         o.name,
         o.description,
         o.subscription_plan_id,
         sp.name AS subscription_plan_name,
         o.timezone,
         o.working_days,
         o.working_start,
         o.working_end
       FROM organizations o
       LEFT JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
       WHERE o.id = $1`,
      [organizationId]
    );

    if (organization.rows.length === 0) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const [attendance, monitoring, holidays, productivityRules, departments] =
      await Promise.all([
        pool.query(
          `SELECT late_after_minutes, half_day_after_minutes,
                  minimum_hours_per_day, allow_weekend_work
           FROM attendance_rules
           WHERE organization_id = $1`,
          [organizationId]
        ),
        pool.query(
          `SELECT screenshot_interval_seconds, idle_threshold_seconds,
                  url_tracking_enabled, app_tracking_enabled,
                  keyboard_activity_tracking_enabled,
                  mouse_activity_tracking_enabled
           FROM monitoring_policies
           WHERE organization_id = $1`,
          [organizationId]
        ),
        pool.query(
          `SELECT id, name, holiday_date
           FROM holidays
           WHERE organization_id = $1
           ORDER BY holiday_date ASC`,
          [organizationId]
        ),
        pool.query(
          `SELECT id, rule_type, pattern, category
           FROM productivity_rules
           WHERE organization_id = $1
           ORDER BY id ASC`,
          [organizationId]
        ),
        pool.query(
          `SELECT d.id, d.name, d.description, d.manager_id, u.name AS manager_name
           FROM departments d
           LEFT JOIN users u ON d.manager_id = u.id
           WHERE d.organization_id = $1
           ORDER BY d.name ASC`,
          [organizationId]
        ),
      ]);

    res.json({
      organization: organization.rows[0],
      attendance_rules: attendance.rows[0],
      monitoring_policy: monitoring.rows[0],
      holidays: holidays.rows,
      productivity_rules: productivityRules.rows,
      departments: departments.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch organization setup" });
  }
};

const updateOrganizationSetup = async (req, res) => {
  const client = await pool.connect();

  try {
    const { organizationId } = req.params;
    const {
      subscription_plan_id,
      timezone,
      working_days,
      working_start,
      working_end,
      attendance_rules,
      monitoring_policy,
    } = req.body;

    await client.query("BEGIN");

    await client.query(
      `UPDATE organizations
       SET subscription_plan_id = COALESCE($1, subscription_plan_id),
           timezone = COALESCE($2, timezone),
           working_days = COALESCE($3::text[], working_days),
           working_start = COALESCE($4::time, working_start),
           working_end = COALESCE($5::time, working_end)
       WHERE id = $6`,
      [
        subscription_plan_id || null,
        timezone || null,
        Array.isArray(working_days) ? working_days : null,
        working_start || null,
        working_end || null,
        organizationId,
      ]
    );

    if (attendance_rules) {
      await client.query(
        `INSERT INTO attendance_rules
         (organization_id, late_after_minutes, half_day_after_minutes,
          minimum_hours_per_day, allow_weekend_work, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (organization_id) DO UPDATE SET
           late_after_minutes = EXCLUDED.late_after_minutes,
           half_day_after_minutes = EXCLUDED.half_day_after_minutes,
           minimum_hours_per_day = EXCLUDED.minimum_hours_per_day,
           allow_weekend_work = EXCLUDED.allow_weekend_work,
           updated_at = NOW()`,
        [
          organizationId,
          attendance_rules.late_after_minutes,
          attendance_rules.half_day_after_minutes,
          attendance_rules.minimum_hours_per_day,
          attendance_rules.allow_weekend_work,
        ]
      );
    }

    if (monitoring_policy) {
      await client.query(
        `INSERT INTO monitoring_policies
         (organization_id, screenshot_interval_seconds, idle_threshold_seconds,
          url_tracking_enabled, app_tracking_enabled,
          keyboard_activity_tracking_enabled, mouse_activity_tracking_enabled,
          updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (organization_id) DO UPDATE SET
           screenshot_interval_seconds = EXCLUDED.screenshot_interval_seconds,
           idle_threshold_seconds = EXCLUDED.idle_threshold_seconds,
           url_tracking_enabled = EXCLUDED.url_tracking_enabled,
           app_tracking_enabled = EXCLUDED.app_tracking_enabled,
           keyboard_activity_tracking_enabled = EXCLUDED.keyboard_activity_tracking_enabled,
           mouse_activity_tracking_enabled = EXCLUDED.mouse_activity_tracking_enabled,
           updated_at = NOW()`,
        [
          organizationId,
          monitoring_policy.screenshot_interval_seconds,
          monitoring_policy.idle_threshold_seconds,
          monitoring_policy.url_tracking_enabled,
          monitoring_policy.app_tracking_enabled,
          monitoring_policy.keyboard_activity_tracking_enabled,
          monitoring_policy.mouse_activity_tracking_enabled,
        ]
      );
    }

    await client.query("COMMIT");

    await ensureOrganizationDefaults(organizationId);

    res.json({ message: "Organization setup updated" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Failed to update organization setup" });
  } finally {
    client.release();
  }
};

const getDepartments = async (req, res) => {
  try {
    const { organizationId } = req.query;
    const params = [];
    let where = "";

    if (organizationId) {
      params.push(organizationId);
      where = "WHERE d.organization_id = $1";
    }

    const result = await pool.query(
      `SELECT d.id, d.organization_id, d.name, d.description,
              d.manager_id, u.name AS manager_name, o.name AS organization_name
       FROM departments d
       JOIN organizations o ON d.organization_id = o.id
       LEFT JOIN users u ON d.manager_id = u.id
       ${where}
       ORDER BY d.id DESC`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch departments" });
  }
};

const addDepartment = async (req, res) => {
  try {
    const { organization_id, name, description, manager_id } = req.body;

    const result = await pool.query(
      `INSERT INTO departments
       (organization_id, name, description, manager_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [organization_id, name, description || null, manager_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add department" });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, manager_id } = req.body;

    const result = await pool.query(
      `UPDATE departments
       SET name = $1,
           description = $2,
           manager_id = $3
       WHERE id = $4
       RETURNING *`,
      [name, description || null, manager_id || null, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Failed to update department" });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    await pool.query("DELETE FROM departments WHERE id = $1", [req.params.id]);
    res.json({ message: "Department deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete department" });
  }
};

const addHoliday = async (req, res) => {
  try {
    const { organization_id, name, holiday_date } = req.body;
    const result = await pool.query(
      `INSERT INTO holidays (organization_id, name, holiday_date)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [organization_id, name, holiday_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Failed to add holiday" });
  }
};

const deleteHoliday = async (req, res) => {
  try {
    await pool.query("DELETE FROM holidays WHERE id = $1", [req.params.id]);
    res.json({ message: "Holiday deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete holiday" });
  }
};

const addProductivityRule = async (req, res) => {
  try {
    const { organization_id, rule_type, pattern, category } = req.body;
    const result = await pool.query(
      `INSERT INTO productivity_rules
       (organization_id, rule_type, pattern, category)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [organization_id, rule_type, pattern, category]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Failed to add productivity rule" });
  }
};

const updateProductivityRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { rule_type, pattern, category } = req.body;
    const result = await pool.query(
      `UPDATE productivity_rules
       SET rule_type = $1,
           pattern = $2,
           category = $3
       WHERE id = $4
       RETURNING *`,
      [rule_type, pattern, category, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Failed to update productivity rule" });
  }
};

const deleteProductivityRule = async (req, res) => {
  try {
    await pool.query("DELETE FROM productivity_rules WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ message: "Productivity rule deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete productivity rule" });
  }
};

const getAgentConfig = async (req, res) => {
  try {
    const { agent_token } = req.query;

    if (!agent_token) {
      return res.status(400).json({ success: false, message: "Missing token" });
    }

    const user = await pool.query(
      `SELECT id, organization_id
       FROM users
       WHERE agent_token = $1`,
      [agent_token]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Invalid token" });
    }

    const organizationId = user.rows[0].organization_id;

    if (!organizationId) {
      return res.json({
        success: true,
        organization_policy: {
          timezone: "America/Los_Angeles",
          working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          working_start: "09:00",
          working_end: "17:00",
          holidays: [],
        },
        monitoring_policy: {
          screenshot_interval_seconds: 0,
          idle_threshold_seconds: 300,
          url_tracking_enabled: true,
          app_tracking_enabled: true,
          keyboard_activity_tracking_enabled: false,
          mouse_activity_tracking_enabled: false,
        },
        productivity_rules: DEFAULT_PRODUCTIVITY_RULES,
      });
    }

    await ensureOrganizationDefaults(organizationId);

    const [organization, monitoring, holidays, productivityRules] = await Promise.all([
      pool.query(
        `SELECT timezone, working_days, working_start, working_end
         FROM organizations
         WHERE id = $1`,
        [organizationId]
      ),
      pool.query(
        `SELECT screenshot_interval_seconds, idle_threshold_seconds,
                url_tracking_enabled, app_tracking_enabled,
                keyboard_activity_tracking_enabled,
                mouse_activity_tracking_enabled
         FROM monitoring_policies
         WHERE organization_id = $1`,
        [organizationId]
      ),
      pool.query(
        `SELECT holiday_date
         FROM holidays
         WHERE organization_id = $1
         ORDER BY holiday_date ASC`,
        [organizationId]
      ),
      pool.query(
        `SELECT rule_type, pattern, category
         FROM productivity_rules
         WHERE organization_id = $1
         ORDER BY id ASC`,
        [organizationId]
      ),
    ]);

    res.json({
      success: true,
      organization_policy: {
        timezone: organization.rows[0]?.timezone || "America/Los_Angeles",
        working_days:
          organization.rows[0]?.working_days || [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
          ],
        working_start: organization.rows[0]?.working_start || "09:00",
        working_end: organization.rows[0]?.working_end || "17:00",
        holidays: holidays.rows.map((holiday) =>
          String(holiday.holiday_date).slice(0, 10)
        ),
      },
      monitoring_policy: monitoring.rows[0],
      productivity_rules: productivityRules.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch config" });
  }
};

module.exports = {
  DEFAULT_PRODUCTIVITY_RULES,
  ensureOrganizationDefaults,
  getSubscriptionPlans,
  getOrganizationSetup,
  updateOrganizationSetup,
  getDepartments,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  addHoliday,
  deleteHoliday,
  addProductivityRule,
  updateProductivityRule,
  deleteProductivityRule,
  getAgentConfig,
};
