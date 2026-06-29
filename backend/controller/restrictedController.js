const pool = require("../db");

const getRestrictedItems = async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT
        type,
        value
      FROM restricted_items
      ORDER BY id ASC
    `);

    const apps = [];
    const sites = [];

    result.rows.forEach((item) => {
      if (item.type === "app") {
        apps.push(item.value);
      } else if (item.type === "site") {
        sites.push(item.value);
      }
    });

    return res.json({
      success: true,
      apps,
      sites,
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  }
};

module.exports = {
  getRestrictedItems,
};