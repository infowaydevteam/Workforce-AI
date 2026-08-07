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
    const summaryData = await pool.query(
        `
WITH working AS (

    SELECT
        user_id,
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
    ${from && to ? "AND DATE(login_time) BETWEEN $2 AND $3" : ""}
    GROUP BY user_id

),

active AS (

    SELECT
        user_id,
        COALESCE(SUM(duration),0) active_time
    FROM activity_logs
    WHERE user_id = ANY($1)
    ${from && to ? "AND DATE(start_time) BETWEEN $2 AND $3" : ""}
    GROUP BY user_id

),

idle AS (

    SELECT
        user_id,
        COALESCE(SUM(duration),0) idle_time
    FROM idle_logs
    WHERE user_id = ANY($1)
    ${from && to ? "AND DATE(start_time) BETWEEN $2 AND $3" : ""}
    GROUP BY user_id

)

SELECT

u.id,

COALESCE(w.working_time,0) working_time,

LEAST(
    COALESCE(a.active_time,0),
    COALESCE(w.working_time,0)
) active_time,

COALESCE(i.idle_time,0) AS idle_time

FROM users u

LEFT JOIN working w
ON u.id=w.user_id

LEFT JOIN active a
ON u.id=a.user_id

LEFT JOIN idle i
ON u.id=i.user_id

WHERE u.id=ANY($1)
`,
        from && to
            ? [userIds, from, to]
            : [userIds]
    );


    console.log(summaryData.rows);

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

),

combined AS (

    SELECT

        COALESCE(a.user_id, i.user_id) AS user_id,

        COALESCE(a.app_name, i.app_name) AS app_name,

        COALESCE(a.active_time, 0) AS active_time,

        COALESCE(i.idle_time, 0) AS idle_time,

        COALESCE(a.active_time, 0) +
        COALESCE(i.idle_time, 0) AS total_time

    FROM active a

    FULL OUTER JOIN idle i

    ON a.user_id = i.user_id
    AND a.app_name = i.app_name

),

ranked AS (

    SELECT

        c.user_id,

        u.name,

        c.app_name,

        c.active_time,

        c.idle_time,

        c.total_time,

        ROW_NUMBER() OVER (
            PARTITION BY c.user_id
            ORDER BY c.total_time DESC
        ) AS rn

    FROM combined c

    JOIN users u
    ON u.id = c.user_id

)

SELECT

    user_id,

    name,

    app_name,

    active_time,

    idle_time,

    total_time

FROM ranked

WHERE rn <= 10

ORDER BY name, total_time DESC;
`,
        from && to
            ? [userIds, from, to]
            : [userIds]
    );


    const productivityIdle = await pool.query(
        `
SELECT

    i.user_id,

    SUM(i.duration) AS productivity_idle

FROM idle_logs i

JOIN productivity_apps p

ON LOWER(i.app_name) LIKE '%' || LOWER(p.app_name) || '%'

WHERE i.user_id = ANY($1)

${from && to
            ? "AND DATE(i.start_time) BETWEEN $2 AND $3"
            : ""}

GROUP BY i.user_id
`,
        from && to
            ? [userIds, from, to]
            : [userIds]
    );


    // ============================
    // SUMMARY
    // ============================

    let workingTime = 0;
    let activeTime = 0;
    let idleTime = 0;

    for (const row of summaryData.rows) {

        workingTime += Number(row.working_time);

        activeTime += Number(row.active_time);

        idleTime += Number(row.idle_time);

    }

    const userSummaryMap = new Map();

    for (const row of summaryData.rows) {

        userSummaryMap.set(Number(row.id), {

            working_time: Number(row.working_time || 0),

            active_time: Number(row.active_time || 0),

            idle_time: Number(row.idle_time || 0)

        });

    }

    const productivityIdleMap = new Map();

    for (const row of productivityIdle.rows) {

        productivityIdleMap.set(

            Number(row.user_id),

            Number(row.productivity_idle || 0)

        );

    }

    const offlineTime = Math.max(
        workingTime - activeTime - idleTime,
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

        const summary = userSummaryMap.get(Number(user.id)) || {

            working_time: 0,

            active_time: 0,

            idle_time: 0

        };

        const overallWorkingTime = summary.working_time;

        const overallActiveTime = summary.active_time;

        const overallIdleTime = summary.idle_time;
        
        const matchedIdleTime =
            productivityIdleMap.get(Number(user.id)) || 0;

        const apps = userAppUsage.rows
            .filter(x => Number(x.user_id) === Number(user.id))
            .map(x => ({
                app_name: x.app_name,
                active_time: Number(x.active_time),
                idle_time: Number(x.idle_time),
                total_time: Number(x.total_time)
            }));

        // ==========================
        // TOP 10 APP SUMMARY
        // ==========================

        let top10ActiveTime = 0;
        let top10IdleTime = 0;

        for (const app of apps) {

            top10ActiveTime += Number(app.active_time || 0);
            top10IdleTime += Number(app.idle_time || 0);

        }

        const top10TotalTime = top10ActiveTime + top10IdleTime;

        // Productivity Time
        const productivityTime = Math.max(

            overallActiveTime - matchedIdleTime,

            0

        );

        let top10Productivity = 0;

        if (overallWorkingTime > 0) {

            top10Productivity = Math.round(

                (productivityTime / overallWorkingTime) * 100

            );

        }

        top10Productivity = Math.min(
            Math.max(top10Productivity, 0),
            100
        );

        userDetails.push({

            user_id: user.id,

            name: user.name,

            working_time: overallWorkingTime,

            active_time: overallActiveTime,

            idle_time: overallIdleTime,

            matched_idle_time: matchedIdleTime,

            top10_active_time: top10ActiveTime,

            top10_idle_time: top10IdleTime,

            top10_total_time: top10TotalTime,

            productivity_time: productivityTime,

            top10_productivity: top10Productivity,

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