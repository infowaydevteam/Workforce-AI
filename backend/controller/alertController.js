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
            `SELECT id, name, email, organization_id, team_id
             FROM users WHERE id = $1`,
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
        // Admin Lookup (always notified)
        // ==========================

        const adminResult = await pool.query(
            `SELECT id, name, email FROM users WHERE role = 'admin' LIMIT 1`
        );

        const admin = adminResult.rows[0] || null;

        // ==========================
        // Manager Lookup (same org + team)
        // ==========================

        const managerResult = await pool.query(
            `SELECT id, name, email FROM users
             WHERE role = 'manager'
             AND organization_id = $1
             AND team_id = $2
             LIMIT 1`,
            [employee.organization_id, employee.team_id]
        );

        const manager = managerResult.rows[0] || null;

        if (!admin && !manager) {
            console.log("No admin or manager found to notify.");
            return res.json({
                success: true,
                message: "Alert received. No recipients found.",
            });
        }

        // ==========================
        // Duplicate Alert Check (30-min window)
        // ==========================

        const duplicateAlert = await pool.query(
            `SELECT id FROM restricted_alerts
             WHERE employee_id = $1
             AND LOWER(website) = LOWER($2)
             AND status = 'Sent'
             AND alert_time >= NOW() - INTERVAL '30 minutes'
             LIMIT 1`,
            [employee.id, website]
        );

        if (duplicateAlert.rows.length > 0) {
            return res.json({
                success: true,
                message: "Duplicate alert ignored.",
            });
        }

        // ==========================
        // Save Alert History
        // ==========================

        const alertResult = await pool.query(
            `INSERT INTO restricted_alerts
             (employee_id, manager_id, website, duration, status)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [
                employee.id,
                manager?.id ?? null,
                website,
                duration,
                "Pending",
            ]
        );

        const alertId = alertResult.rows[0].id;

        // ==========================
        // Send Emails
        // ==========================

        try {
            const recipients = [];

            // Always email admin
            if (admin) {
                recipients.push({
                    recipientEmail: admin.email,
                    recipientName: admin.name,
                });
            }

            // Also email manager if different from admin
            if (manager && manager.email !== admin?.email) {
                recipients.push({
                    recipientEmail: manager.email,
                    recipientName: manager.name,
                });
            }

            await Promise.all(
                recipients.map(({ recipientEmail, recipientName }) =>
                    sendRestrictedWebsiteAlert({
                        recipientEmail,
                        recipientName,
                        employeeName: employee.name,
                        employeeEmail: employee.email,
                        website,
                        duration,
                    })
                )
            );

            await pool.query(
                `UPDATE restricted_alerts SET status = 'Sent' WHERE id = $1`,
                [alertId]
            );

            console.log(`Alert sent to: ${recipients.map(r => r.recipientEmail).join(", ")}`);

            return res.json({
                success: true,
                message: "Alert email sent successfully",
            });

        } catch (emailError) {

            console.error("Email Error:", emailError.message);

            await pool.query(
                `UPDATE restricted_alerts SET status = 'Failed' WHERE id = $1`,
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
