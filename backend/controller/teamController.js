const pool = require("../db");

// Get all teams with organization name
const getTeams = async (req, res) => {
  try {
    const result = await pool.query(`
  SELECT 
    teams.id,
    teams.name AS team_name,
    teams.organization_id,
    organizations.name AS organization_name
  FROM teams
  JOIN organizations 
  ON teams.organization_id = organizations.id
  ORDER BY teams.id DESC
`);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch teams" });
  }
};

// Add team
const addTeam = async (req, res) => {
  try {
    const { name, organization_id } = req.body;

    const result = await pool.query(
      `INSERT INTO teams (name, organization_id)
       VALUES ($1, $2)
       RETURNING *`,
      [name, organization_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add team" });
  }
};

// Delete team
const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM teams WHERE id=$1", [id]);

    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete team" });
  }
};

module.exports = {
  getTeams,
  addTeam,
  deleteTeam,
};