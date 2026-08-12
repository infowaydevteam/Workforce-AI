const pool = require("../db");

// Get all teams with organization name
const getTeams = async (req, res) => {
  try {
    const result = await pool.query(`
  SELECT
    teams.id,
    teams.name AS team_name,
    teams.organization_id,
    teams.department_id,
    teams.manager_id,
    teams.description,
    organizations.name AS organization_name,
    departments.name AS department_name,
    users.name AS manager_name
  FROM teams
  JOIN organizations
  ON teams.organization_id = organizations.id
  LEFT JOIN departments
  ON teams.department_id = departments.id
  LEFT JOIN users
  ON teams.manager_id = users.id
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
    const {
      name,
      organization_id,
      department_id,
      manager_id,
      description,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO teams
       (name, organization_id, department_id, manager_id, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        name,
        organization_id,
        department_id || null,
        manager_id || null,
        description || null,
      ]
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

const updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      organization_id,
      department_id,
      manager_id,
      description,
    } = req.body;

    const result = await pool.query(
      `UPDATE teams
       SET name = $1,
           organization_id = $2,
           department_id = $3,
           manager_id = $4,
           description = $5
       WHERE id = $6
       RETURNING *`,
      [
        name,
        organization_id,
        department_id || null,
        manager_id || null,
        description || null,
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update team" });
  }
};

module.exports = {
  getTeams,
  addTeam,
  updateTeam,
  deleteTeam,
};