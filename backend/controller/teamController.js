const pool = require("../db");

// Get all teams with organization name
const getTeams = async (req, res) => {
  try {

    let query = `
      SELECT
        teams.id,
        teams.name AS team_name,
        teams.organization_id,
        organizations.name AS organization_name
      FROM teams
      JOIN organizations
        ON teams.organization_id = organizations.id
    `;

    let values = [];


    if (req.user.role !== "superadmin") {
      query += ` WHERE teams.organization_id = $1`;
      values.push(req.user.organization_id);
    }

    query += ` ORDER BY teams.id DESC`;

    const result = await pool.query(query, values);

    res.status(200).json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch teams"
    });
  }
};

// Add team
const addTeam = async (req, res) => {
  try {
    const { name, organization_id } = req.body;

    let orgId;

    if (req.user.role === "superadmin") {

      orgId = organization_id;
    } else {
      orgId = req.user.organization_id;
    }

    const result = await pool.query(
      `
      INSERT INTO teams (name, organization_id)
      VALUES ($1, $2)
      RETURNING *
      `,
      [name, orgId]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to add team"
    });
  }
};

// Delete team
const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;

    // Super Admin
    if (req.user.role === "superadmin") {
      await pool.query(
        "DELETE FROM teams WHERE id = $1",
        [id]
      );
    } else {
      const result = await pool.query(
        `
        DELETE FROM teams
        WHERE id = $1
        AND organization_id = $2
        RETURNING *
        `,
        [id, req.user.organization_id]
      );

      if (result.rowCount === 0) {
        return res.status(403).json({
          message: "Unauthorized to delete this team",
        });
      }
    }

    res.status(200).json({
      message: "Deleted successfully",
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to delete team",
    });
  }
};

module.exports = {
  getTeams,
  addTeam,
  deleteTeam,
};