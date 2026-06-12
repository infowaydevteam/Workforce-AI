const pool = require("../db");

const getClassifications = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM app_categories ORDER BY category, app_name"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch classifications" });
  }
};

const upsertClassification = async (req, res) => {
  try {
    const { app_name, category, is_productive } = req.body;
    if (!app_name) return res.status(400).json({ message: "app_name is required" });

    const result = await pool.query(
      `INSERT INTO app_categories (app_name, category, is_productive)
       VALUES ($1, $2, $3)
       ON CONFLICT (app_name) DO UPDATE
         SET category = EXCLUDED.category,
             is_productive = EXCLUDED.is_productive
       RETURNING *`,
      [app_name, category || "Uncategorized", is_productive !== undefined ? is_productive : true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Failed to save classification" });
  }
};

const deleteClassification = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM app_categories WHERE id = $1", [id]);
    res.json({ message: "Classification deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete classification" });
  }
};

// Auto-classify any unclassified apps found in activity_logs
const autoClassifyUnknown = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT app_name FROM activity_logs
      WHERE app_name NOT IN (SELECT app_name FROM app_categories)
    `);

    const unclassified = result.rows;
    if (unclassified.length === 0) {
      return res.json({ message: "All apps already classified", count: 0 });
    }

    for (const row of unclassified) {
      await pool.query(
        `INSERT INTO app_categories (app_name, category, is_productive)
         VALUES ($1, 'Uncategorized', false)
         ON CONFLICT (app_name) DO NOTHING`,
        [row.app_name]
      );
    }

    res.json({ message: `Auto-classified ${unclassified.length} apps`, count: unclassified.length, apps: unclassified });
  } catch (err) {
    res.status(500).json({ message: "Auto-classify failed" });
  }
};

module.exports = { getClassifications, upsertClassification, deleteClassification, autoClassifyUnknown };
