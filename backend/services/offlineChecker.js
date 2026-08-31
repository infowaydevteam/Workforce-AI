const pool = require("../db");

function startOfflineChecker() {
    console.log("Offline Checker Started");
    console.log("Offline Checker PID:", process.pid);

    setInterval(async () => {
        console.log("Offline Checker Tick", new Date());

        try {
            // =====================================================
            // FIND USERS WITH NO HEARTBEAT FOR 30+ SECONDS
            // =====================================================

            const users = await pool.query(`
                SELECT
                    u.id,
                    u.name,
                    u.status,
                    u.last_active,
                    o.timezone,

                    NOW() AS current_time,

                    EXTRACT(
                        EPOCH FROM (NOW() - u.last_active)
                    ) AS diff_seconds

                FROM users u

                LEFT JOIN organizations o
                    ON u.organization_id = o.id

                WHERE LOWER(u.status) <> 'offline'
                AND u.last_active IS NOT NULL
                AND u.last_active < NOW() - INTERVAL '30 seconds'
            `);

            for (const user of users.rows) {

                console.log("-----------------------");
                console.log("User :", user.name);
                console.log("Status :", user.status);
                console.log("Last Active :", user.last_active);
                console.log("Organization Timezone :", user.timezone);
                console.log("Now :", user.current_time);
                console.log(
                    "Difference :",
                    user.diff_seconds,
                    "sec"
                );

                // =================================================
                // GET LATEST USER STATE
                // =================================================

                const verify = await pool.query(
                    `
                    SELECT
                        status,
                        last_active,
                        EXTRACT(
                            EPOCH FROM (NOW() - last_active)
                        ) AS diff_seconds
                    FROM users
                    WHERE id = $1
                    `,
                    [user.id]
                );

                if (verify.rows.length === 0) {
                    continue;
                }

                const latest = verify.rows[0];

                // =================================================
                // ALREADY OFFLINE
                // =================================================

                if (
                    String(latest.status).toLowerCase() === "offline"
                ) {
                    continue;
                }

                const diff = Number(
                    latest.diff_seconds || 0
                );

                console.log(
                    `Latest Difference : ${Math.floor(diff)} sec`
                );

                // =================================================
                // HEARTBEAT STILL ACTIVE
                // =================================================

                if (diff < 30) {
                    continue;
                }

                console.log(
                    `${user.name} Offline (${Math.floor(diff)} sec no heartbeat)`
                );

                console.log(
                    "Last heartbeat:",
                    latest.last_active
                );

                // =================================================
                // SET USER OFFLINE
                // =================================================

                await pool.query(
                    `
                    UPDATE users
                    SET status = 'Offline'
                    WHERE id = $1
                    `,
                    [user.id]
                );

                console.log(
                    `User ${user.id} status changed to Offline`
                );

                // =================================================
                // FIND ACTIVE SESSION
                // =================================================

                const session = await pool.query(
                    `
                    SELECT
                        id,
                        login_time
                    FROM sessions
                    WHERE user_id = $1
                    AND logout_time IS NULL
                    ORDER BY login_time DESC
                    LIMIT 1
                    `,
                    [user.id]
                );

                if (session.rows.length === 0) {

                    console.log(
                        `No active session found for User ${user.id}`
                    );

                    continue;
                }

                const sessionId = session.rows[0].id;
                const loginTime = session.rows[0].login_time;

                // =================================================
                // FORCE-KILL CASE
                //
                // Agent was killed, so EndSession() never runs.
                //
                // Therefore:
                // last_active = LAST TIME AGENT WAS ALIVE
                //
                // IMPORTANT:
                // Do NOT use AT TIME ZONE here.
                // Do NOT use NOW() as logout_time.
                //
                // We store exactly the last_active value.
                // =================================================

                const logoutTime = latest.last_active;

                console.log(
                    "Force Kill Detected"
                );

                console.log(
                    "Login Time ->",
                    loginTime
                );

                console.log(
                    "Last Heartbeat ->",
                    logoutTime
                );

                // =================================================
                // CALCULATE SESSION DURATION
                // =================================================

                const durationResult = await pool.query(
                    `
                    SELECT
                        GREATEST(
                            0,
                            EXTRACT(
                                EPOCH FROM (
                                    $1::timestamp - $2::timestamp
                                )
                            )
                        )::INTEGER AS duration
                    `,
                    [
                        logoutTime,
                        loginTime
                    ]
                );

                const totalDuration =
                    Number(
                        durationResult.rows[0]?.duration || 0
                    );

                console.log(
                    "Force Kill Duration ->",
                    totalDuration,
                    "seconds"
                );

                // =================================================
                // CLOSE SESSION
                // =================================================

                await pool.query(
                    `
                    UPDATE sessions
                    SET
                        logout_time = $1,
                        total_duration = $2
                    WHERE id = $3
                    AND logout_time IS NULL
                    `,
                    [
                        logoutTime,
                        totalDuration,
                        sessionId
                    ]
                );

                console.log(
                    `Session Closed -> User ${user.id}`
                );

                console.log(
                    `Logout Time -> ${logoutTime}`
                );
            }

        } catch (err) {

            console.error(
                "Offline Checker Error:",
                err.message
            );
        }

    }, 10000);
}

module.exports = startOfflineChecker;