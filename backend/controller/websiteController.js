const pool = require("../db");

const getTrackedWebsites = async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT website_name
            FROM tracked_websites
            WHERE status = true
            ORDER BY website_name
            `
        );

        res.json({
            success: true,
            websites: result.rows.map(x => x.website_name.toLowerCase())
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

module.exports = {
    getTrackedWebsites
};