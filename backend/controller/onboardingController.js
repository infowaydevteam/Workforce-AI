const pool = require("../db");

const defaultAttendanceRules = {
  grace_period_minutes: 10,
  half_day_hours: 4,
  full_day_hours: 8,
  overtime_enabled: true,
  auto_checkout_enabled: true,
  allow_remote_check_in: false,
};

const normalizeHolidays = (holidays = []) =>
  holidays
    .filter((holiday) => holiday.name && holiday.holiday_date)
    .map((holiday) => ({
      name: holiday.name,
      holiday_date: holiday.holiday_date,
      holiday_type: holiday.holiday_type || "company",
    }));

const getOnboardingOptions = async (req, res) => {
  res.json({
    subscriptionPlans: [
      {
        id: "starter",
        name: "Starter",
        employeeLimit: 50,
        retentionDays: 30,
      },
      {
        id: "growth",
        name: "Growth",
        employeeLimit: 250,
        retentionDays: 180,
      },
      {
        id: "enterprise",
        name: "Enterprise",
        employeeLimit: 1000,
        retentionDays: 365,
      },
    ],
    timezones: [
      "America/Los_Angeles",
      "America/Denver",
      "America/Chicago",
      "America/New_York",
      "UTC",
      "Asia/Kolkata",
      "Europe/London",
    ],
    workingDays: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    attendanceRuleDefaults: defaultAttendanceRules,
  });
};

const getOrganizationOnboarding = async (req, res) => {
  try {
    const { organizationId } = req.params;

    const organization = await pool.query(
      `
      SELECT
        o.id,
        o.name,
        o.description,
        s.subscription_plan,
        s.timezone,
        s.working_days,
        s.working_start,
        s.working_end,
        s.break_minutes,
        s.attendance_rules,
        s.onboarding_status,
        s.completed_at
      FROM organizations o
      LEFT JOIN organization_onboarding_settings s
        ON s.organization_id = o.id
      WHERE o.id = $1
      `,
      [organizationId]
    );

    if (organization.rows.length === 0) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const holidays = await pool.query(
      `
      SELECT id, name, holiday_date, holiday_type
      FROM organization_holidays
      WHERE organization_id = $1
      ORDER BY holiday_date ASC
      `,
      [organizationId]
    );

    const row = organization.rows[0];

    res.json({
      organization: {
        id: row.id,
        name: row.name,
        description: row.description,
      },
      subscription_plan: row.subscription_plan || "starter",
      timezone: row.timezone || "America/Los_Angeles",
      working_hours: {
        working_days:
          row.working_days || [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
          ],
        working_start: row.working_start || "09:00:00",
        working_end: row.working_end || "17:00:00",
        break_minutes: row.break_minutes ?? 60,
      },
      holidays: holidays.rows,
      attendance_rules: {
        ...defaultAttendanceRules,
        ...(row.attendance_rules || {}),
      },
      onboarding_status: row.onboarding_status || "draft",
      completed_at: row.completed_at,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch onboarding settings" });
  }
};

const saveCompanyOnboarding = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      organization = {},
      subscription_plan = "starter",
      timezone = "America/Los_Angeles",
      working_hours = {},
      holidays = [],
      attendance_rules = {},
      complete = false,
    } = req.body;

    if (!organization.name) {
      return res.status(400).json({
        message: "Organization name is required",
      });
    }

    await client.query("BEGIN");

    let organizationId = organization.id || null;

    if (organizationId) {
      const updated = await client.query(
        `
        UPDATE organizations
        SET name = $1, description = $2
        WHERE id = $3
        RETURNING id, name, description
        `,
        [organization.name, organization.description || null, organizationId]
      );

      if (updated.rows.length === 0) {
        throw new Error("Organization not found");
      }

      organizationId = updated.rows[0].id;
    } else {
      const created = await client.query(
        `
        INSERT INTO organizations (name, description)
        VALUES ($1, $2)
        RETURNING id, name, description
        `,
        [organization.name, organization.description || null]
      );

      organizationId = created.rows[0].id;
    }

    const workingDays =
      working_hours.working_days?.length > 0
        ? working_hours.working_days
        : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    const mergedAttendanceRules = {
      ...defaultAttendanceRules,
      ...attendance_rules,
    };

    const status = complete ? "complete" : "draft";

    const settings = await client.query(
      `
      INSERT INTO organization_onboarding_settings (
        organization_id,
        subscription_plan,
        timezone,
        working_days,
        working_start,
        working_end,
        break_minutes,
        attendance_rules,
        onboarding_status,
        completed_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8::jsonb,$9,$10,NOW())
      ON CONFLICT (organization_id)
      DO UPDATE SET
        subscription_plan = EXCLUDED.subscription_plan,
        timezone = EXCLUDED.timezone,
        working_days = EXCLUDED.working_days,
        working_start = EXCLUDED.working_start,
        working_end = EXCLUDED.working_end,
        break_minutes = EXCLUDED.break_minutes,
        attendance_rules = EXCLUDED.attendance_rules,
        onboarding_status = EXCLUDED.onboarding_status,
        completed_at = EXCLUDED.completed_at,
        updated_at = NOW()
      RETURNING *
      `,
      [
        organizationId,
        subscription_plan,
        timezone,
        JSON.stringify(workingDays),
        working_hours.working_start || "09:00",
        working_hours.working_end || "17:00",
        Number(working_hours.break_minutes ?? 60),
        JSON.stringify(mergedAttendanceRules),
        status,
        complete ? new Date() : null,
      ]
    );

    await client.query(
      "DELETE FROM organization_holidays WHERE organization_id = $1",
      [organizationId]
    );

    const normalizedHolidays = normalizeHolidays(holidays);

    for (const holiday of normalizedHolidays) {
      await client.query(
        `
        INSERT INTO organization_holidays
          (organization_id, name, holiday_date, holiday_type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (organization_id, holiday_date, name)
        DO UPDATE SET holiday_type = EXCLUDED.holiday_type
        `,
        [
          organizationId,
          holiday.name,
          holiday.holiday_date,
          holiday.holiday_type,
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: complete
        ? "Company onboarding completed"
        : "Company onboarding saved",
      organization_id: organizationId,
      settings: settings.rows[0],
      holidays: normalizedHolidays,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({
      message: "Failed to save company onboarding",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getOnboardingOptions,
  getOrganizationOnboarding,
  saveCompanyOnboarding,
};
