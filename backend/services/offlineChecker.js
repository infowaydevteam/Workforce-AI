const pool = require("../db");

function startOfflineChecker() {

    setInterval(async () => {

        try {

            const result = await pool.query(`
                UPDATE users
                SET status='Offline'
                WHERE status!='Offline'
                AND last_active < NOW() - INTERVAL '90 seconds'
                RETURNING id,name;
            `);

            if (result.rows.length > 0) {
                console.log("Users marked Offline");
                console.table(result.rows);
            }

        } catch (err) {
            console.error("Offline Checker Error:", err.message);
        }

    }, 60000); // Every 60 seconds

}

module.exports = startOfflineChecker;