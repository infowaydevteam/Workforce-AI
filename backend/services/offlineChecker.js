const pool = require("../db");

function startOfflineChecker() {
    console.log("Offline Checker Started");
    console.log("Offline Checker PID:", process.pid);
    setInterval(async () => {
        console.log("Offline Checker Tick", new Date());
        try {

            const users = await pool.query(`
                SELECT
                    id,
                    name,
                    status,
                    last_active,
                    NOW() AS current_time,
                    EXTRACT(EPOCH FROM (NOW() - last_active)) AS diff_seconds
                FROM users
                WHERE LOWER(status) <> 'offline'
                AND last_active IS NOT NULL
                AND last_active < NOW() - INTERVAL '30 seconds'
            `);

            for (const user of users.rows) {

                console.log("-----------------------");
                console.log("User :", user.name);
                console.log("Status :", user.status);
                console.log("Last Active :", user.last_active);
                console.log("Now :", user.current_time);
                console.log("Difference :", user.diff_seconds, "sec");



                // Double check latest value
                const verify = await pool.query(
                    `
                    SELECT
                        status,
                        last_active
                    FROM users
                    WHERE id = $1
                    `,
                    [user.id]
                );

                if (verify.rows.length === 0)
                    continue;

                const latest = verify.rows[0];

                if (latest.status.toLowerCase() === "offline")
                    continue;

                const diff =
                    (Date.now() - new Date(latest.last_active).getTime()) / 1000;

                console.log(
                    `Latest Difference : ${Math.floor(diff)} sec`
                );

                if (diff < 30)
                    continue;

                console.log(
                    `${user.name} Offline (${Math.floor(diff)} sec no heartbeat)`
                );

                console.log(
                    "Checker:",
                    latest.last_active,
                    new Date().toISOString(),
                    diff
                );

                // Offline
                await pool.query(
                    `
                    UPDATE users
                    SET status='Offline'
                    WHERE id=$1
                    `,
                    [user.id]
                );

                // Close active session
                const session = await pool.query(
                    `
                    SELECT
                        id,
                        login_time
                    FROM sessions
                    WHERE user_id=$1
                    AND logout_time IS NULL
                    ORDER BY login_time DESC
                    LIMIT 1
                    `,
                    [user.id]
                );

                if (session.rows.length > 0) {

                    const loginTime = new Date(session.rows[0].login_time);

                    const duration = Math.floor(
                        (Date.now() - loginTime.getTime()) / 1000
                    );

                    await pool.query(
                        `
                        UPDATE sessions
                        SET
                            logout_time = NOW(),
                            total_duration = $1
                        WHERE id = $2
                        `,
                        [
                            duration,
                            session.rows[0].id
                        ]
                    );

                    console.log(
                        `Session Closed -> User ${user.id}`
                    );
                }
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