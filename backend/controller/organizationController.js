const pool = require("../db");
const { ensureOrganizationDefaults } = require("./adminWorkflowController");

// Get all organizations
const getOrganizations = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
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
      ORDER BY o.id DESC
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch organizations" });
  }
};

// Add organization
const addOrganization = async (req, res) => {
  try {
    const {
      name,
      description,
      subscription_plan_id,
      timezone,
      working_days,
      working_start,
      working_end,
      attendance_rules,
      monitoring_policy,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO organizations
       (name, description, subscription_plan_id, timezone,
        working_days, working_start, working_end)
       VALUES ($1, $2, COALESCE($3, (SELECT id FROM subscription_plans WHERE name = 'Free')),
               COALESCE($4, 'America/Los_Angeles'),
               COALESCE($5::text[], ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday']),
               COALESCE($6::time, '09:00'),
               COALESCE($7::time, '17:00'))
       RETURNING *`,
      [
        name,
        description,
        subscription_plan_id || null,
        timezone || null,
        Array.isArray(working_days) ? working_days : null,
        working_start || null,
        working_end || null,
      ]
    );

    const organizationId = result.rows[0].id;

    await ensureOrganizationDefaults(organizationId);

    if (attendance_rules) {
      await pool.query(
        `UPDATE attendance_rules
         SET late_after_minutes = $1,
             half_day_after_minutes = $2,
             minimum_hours_per_day = $3,
             allow_weekend_work = $4,
             updated_at = NOW()
         WHERE organization_id = $5`,
        [
          attendance_rules.late_after_minutes,
          attendance_rules.half_day_after_minutes,
          attendance_rules.minimum_hours_per_day,
          attendance_rules.allow_weekend_work,
          organizationId,
        ]
      );
    }

    if (monitoring_policy) {
      await pool.query(
        `UPDATE monitoring_policies
         SET screenshot_interval_seconds = $1,
             idle_threshold_seconds = $2,
             url_tracking_enabled = $3,
             app_tracking_enabled = $4,
             keyboard_activity_tracking_enabled = $5,
             mouse_activity_tracking_enabled = $6,
             updated_at = NOW()
         WHERE organization_id = $7`,
        [
          monitoring_policy.screenshot_interval_seconds,
          monitoring_policy.idle_threshold_seconds,
          monitoring_policy.url_tracking_enabled,
          monitoring_policy.app_tracking_enabled,
          monitoring_policy.keyboard_activity_tracking_enabled,
          monitoring_policy.mouse_activity_tracking_enabled,
          organizationId,
        ]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add organization" });
  }
};

// Delete organization
const deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      "DELETE FROM organizations WHERE id=$1",
      [id]
    );

    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete organization" });
  }
};

module.exports = {
  getOrganizations,
  addOrganization,
  deleteOrganization,
};
