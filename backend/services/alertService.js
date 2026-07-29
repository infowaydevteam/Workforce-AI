const pool = require("../db");

const createIdleAlert = async (userId, idleDuration) => {

    // Check user

    const user = await pool.query(
        `
        SELECT id,name
        FROM users
        WHERE id=$1
        `,
        [userId]
    );

    if (user.rows.length === 0) {
        throw new Error("User not found");
    }

    // Duplicate unread alert check

    const exists = await pool.query(
        `
        SELECT id
        FROM alerts
        WHERE user_id=$1
        AND alert_type='IDLE'
        AND is_read=false
        LIMIT 1
        `,
        [userId]
    );

    if (exists.rows.length > 0) {

        return {
            success: true,
            message: "Idle alert already exists."
        };

    }

    const username = user.rows[0].name;

    const message =
        `${username} has been idle for ${Math.floor(idleDuration / 60)} minutes.`;

    await pool.query(
        `
        INSERT INTO alerts
        (
            user_id,
            alert_type,
            message
        )
        VALUES
        ($1,$2,$3)
        `,
        [
            userId,
            "IDLE",
            message
        ]
    );

    return {

        success: true,

        message: "Idle alert created successfully."

    };

};

module.exports = {

    createIdleAlert

};