const pool = require("../db");

// Get all organizations
const getOrganizations = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description
      FROM organizations
      ORDER BY id DESC
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch organizations" });
  }
};

// Add organization
const addOrganization = async (req, res) => {
  try {
    const { name, description } = req.body;

    const result = await pool.query(
      `INSERT INTO organizations (name, description)
       VALUES ($1, $2)
       RETURNING *`,
      [name, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add organization" });
  }
};

// Delete organization
const deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      "DELETE FROM organizations WHERE id=$1",
      [id]
    );

    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete organization" });
  }
};

module.exports = {
  getOrganizations,
  addOrganization,
  deleteOrganization,
};