const pool = require("../db");
const { sendRestrictedWebsiteAlert } = require("../middleware/emailService");

const sendRestrictedAlert = async (req, res) => {
    try {
        console.log(req.body);
        const { userId, website, duration } = req.body;

        if (userId == null || !website || duration == null) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
            });
        }

        // ==========================
        // Employee Details
        // ==========================

        const employeeResult = await pool.query(
            `
      SELECT
        id,
        name,
        email,
        organization_id,
        team_id
      FROM users
      WHERE id = $1
      `,
            [userId]
        );

        if (employeeResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Employee not found",
            });
        }

        const employee = employeeResult.rows[0];

        // ==========================
        // Manager Lookup
        // ==========================

        const managerResult = await pool.query(
            `
      SELECT
        id,
        name,
        email
      FROM users
      WHERE role = 'manager'
      AND organization_id = $1
      AND team_id = $2
      LIMIT 1
      `,
            [
                employee.organization_id,
                employee.team_id,
            ]
        );

        if (managerResult.rows.length === 0) {
            console.log(
                `No manager assigned for Organization ${employee.organization_id} Team ${employee.team_id}`
            );

            return res.json({
                success: true,
                message: "Alert received. No manager assigned.",
            });
        }

        const manager = managerResult.rows[0];

        // ==========================
        // Duplicate Alert Check
        // ==========================

        const duplicateAlert = await pool.query(
            `
SELECT id
FROM restricted_alerts
WHERE employee_id = $1
AND LOWER(website)=LOWER($2)
AND status='Sent'
AND alert_time >= NOW() - INTERVAL '30 minutes'
LIMIT 1
`,
            [
                employee.id,
                website
            ]
        );

        if (duplicateAlert.rows.length > 0) {
            return res.json({
                success: true,
                message: "Duplicate alert ignored."
            });
        }

        // ==========================
        // Save Alert History
        // ==========================

        const alertResult = await pool.query(
            `
      INSERT INTO restricted_alerts
      (
        employee_id,
        manager_id,
        website,
        duration,
        status
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id
      `,
            [
                employee.id,
                manager.id,
                website,
                duration,
                "Pending",
            ]
        );

        const alertId = alertResult.rows[0].id;

        // ==========================
        // Send Email
        // ==========================

        try {

            await sendRestrictedWebsiteAlert({
                managerEmail: manager.email,
                managerName: manager.name,
                employeeName: employee.name,
                website,
                duration,
            });

            // Email Success

            await pool.query(
                `
        UPDATE restricted_alerts
        SET status='Sent'
        WHERE id=$1
        `,
                [alertId]
            );

            return res.json({
                success: true,
                message: "Alert email sent successfully",
            });

        } catch (emailError) {

            console.error("Email Error:", emailError.message);

            // Email Failed

            await pool.query(
                `
        UPDATE restricted_alerts
        SET status='Failed'
        WHERE id=$1
        `,
                [alertId]
            );

            return res.status(500).json({
                success: false,
                message: "Alert saved but email failed.",
            });

        }

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message,
        });

    }
};

module.exports = {
    sendRestrictedAlert,
};