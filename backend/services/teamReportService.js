const pool = require("../db");

const getTeamReport = async (team_id, from, to) => {

    // ============================
    // TEAM ADMIN
    // ============================

    const admin = await pool.query(
        `
        SELECT
            id,
            name,
            email,
            organization_id,
            team_id
        FROM users
        WHERE team_id=$1
        AND role='admin'
        LIMIT 1
        `,
        [team_id]
    );

    if (admin.rows.length === 0) {
        throw new Error("Team admin not found");
    }

    const adminData = admin.rows[0];

    // ============================
    // TEAM USERS
    // ============================

    const users = await pool.query(
        `
        SELECT
            id,
            name
        FROM users
        WHERE team_id=$1
        AND organization_id=$2
        `,
        [
            team_id,
            adminData.organization_id
        ]
    );

    if (users.rows.length === 0) {
        throw new Error("No users found in team");
    }

    const userIds = users.rows.map(u => u.id);
    // ============================
    // WORKING TIME
    // ============================

    const working = await pool.query(
        `
        SELECT
            COALESCE(
                SUM(
                    CASE
                        WHEN logout_time IS NULL
                        THEN EXTRACT(EPOCH FROM (NOW() - login_time))
                        ELSE total_duration
                    END
                ),
                0
            ) AS working_time

        FROM sessions

        WHERE user_id = ANY($1)

        ${from && to
            ? "AND DATE(login_time) BETWEEN $2 AND $3"
            : ""
        }
        `,
        from && to
            ? [userIds, from, to]
            : [userIds]
    );



    // ============================
    // ACTIVE TIME
    // ============================

    const active = await pool.query(
        `
        SELECT
            COALESCE(
                SUM(duration),
                0
            ) AS active_time

        FROM activity_logs

        WHERE user_id = ANY($1)

        ${from && to
            ? "AND DATE(start_time) BETWEEN $2 AND $3"
            : ""
        }
        `,
        from && to
            ? [userIds, from, to]
            : [userIds]
    );



    // ============================
    // IDLE TIME
    // ============================

    const idle = await pool.query(
        `
        SELECT
            COALESCE(
                SUM(duration),
                0
            ) AS idle_time

        FROM idle_logs

        WHERE user_id = ANY($1)

        ${from && to
            ? "AND DATE(start_time) BETWEEN $2 AND $3"
            : ""
        }
        `,
        from && to
            ? [userIds, from, to]
            : [userIds]
    );
    // ============================
    // APPLICATION REPORT
    // ============================

    const appUsage = await pool.query(
        `
        WITH active AS (

            SELECT
                LOWER(app_name) AS app_name,
                SUM(duration) AS active_time

            FROM activity_logs

            WHERE user_id = ANY($1)

            ${from && to
            ? "AND DATE(start_time) BETWEEN $2 AND $3"
            : ""
        }

            GROUP BY LOWER(app_name)

        ),

        idle AS (

            SELECT
                LOWER(app_name) AS app_name,
                SUM(duration) AS idle_time

            FROM idle_logs

            WHERE user_id = ANY($1)

            ${from && to
            ? "AND DATE(start_time) BETWEEN $2 AND $3"
            : ""
        }

            GROUP BY LOWER(app_name)

        )

        SELECT

            COALESCE(a.app_name, i.app_name) AS app_name,

            COALESCE(a.active_time,0) AS active_time,

            COALESCE(i.idle_time,0) AS idle_time,

            COALESCE(a.active_time,0)
            +
            COALESCE(i.idle_time,0)
            AS total_time

        FROM active a

        FULL OUTER JOIN idle i

        ON a.app_name=i.app_name

        ORDER BY total_time DESC
        Limit 10;
        `,
        from && to
            ? [userIds, from, to]
            : [userIds]
    );


    const userAppUsage = await pool.query(
        `
WITH active AS (

SELECT
user_id,
LOWER(app_name) AS app_name,
SUM(duration) AS active_time

FROM activity_logs

WHERE user_id = ANY($1)

${from && to
            ? "AND DATE(start_time) BETWEEN $2 AND $3"
            : ""
        }

GROUP BY user_id, LOWER(app_name)

),

idle AS (

SELECT
user_id,
LOWER(app_name) AS app_name,
SUM(duration) AS idle_time

FROM idle_logs

WHERE user_id = ANY($1)

${from && to
            ? "AND DATE(start_time) BETWEEN $2 AND $3"
            : ""
        }

GROUP BY user_id, LOWER(app_name)

)

SELECT

COALESCE(a.user_id,i.user_id) user_id,

u.name,

COALESCE(a.app_name,i.app_name) app_name,

COALESCE(a.active_time,0) active_time,

COALESCE(i.idle_time,0) idle_time,

COALESCE(a.active_time,0)+
COALESCE(i.idle_time,0)
AS total_time

FROM active a

FULL OUTER JOIN idle i

ON
a.user_id=i.user_id
AND
a.app_name=i.app_name

JOIN users u
ON u.id=COALESCE(a.user_id,i.user_id)

ORDER BY
u.name,
total_time DESC
Limit 10;
`,
        from && to
            ? [userIds, from, to]
            : [userIds]
    );


    // ============================
    // SUMMARY
    // ============================

    const workingTime =
        Number(
            working.rows[0].working_time || 0
        );

    const activeTime =
        Number(
            active.rows[0].active_time || 0
        );

    const idleTime =
        Number(
            idle.rows[0].idle_time || 0
        );

    const offlineTime = Math.max(
        workingTime - (activeTime + idleTime),
        0
    );


    let productivity = 0;

    if (workingTime > 0) {

        productivity = Math.round(
            (activeTime / workingTime) * 100
        );

    }

    if (productivity > 100)
        productivity = 100;

    if (productivity < 0)
        productivity = 0;


    const userDetails = [];

    for (const user of users.rows) {

        const apps = userAppUsage.rows
            .filter(x => x.user_id === user.id)
            .map(x => ({
                app_name: x.app_name,
                active_time: Number(x.active_time),
                idle_time: Number(x.idle_time),
                total_time: Number(x.total_time)
            }));

        userDetails.push({

            user_id: user.id,

            name: user.name,

            applications: apps

        });
    }
    return {

        organization: {
            id: adminData.organization_id
        },

        team: {
            id: team_id
        },

        admin: {
            id: adminData.id,
            name: adminData.name,
            email: adminData.email
        },

        report_period: {
            from: from || null,
            to: to || null
        },

        summary: {

            total_members: users.rows.length,

            working_time: workingTime,

            active_time: activeTime,

            idle_time: idleTime,

            offline_time: offlineTime,

            productivity: productivity

        },

        app_usage: appUsage.rows,
        user_details: userDetails

    };

};

module.exports = {
    getTeamReport
};