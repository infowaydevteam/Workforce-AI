const pool = require("../db");

const getDepartments = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.id, d.name, d.created_at,
             o.name AS organization_name,
             o.id AS organization_id,
             u.name AS manager_name,
             u.id AS manager_id,
             COUNT(emp.id) AS employee_count
      FROM departments d
      LEFT JOIN organizations o ON d.organization_id = o.id
      LEFT JOIN users u ON d.manager_id = u.id
      LEFT JOIN users emp ON emp.department_id = d.id AND emp.role != 'admin'
      GROUP BY d.id, d.name, d.created_at, o.name, o.id, u.name, u.id
      ORDER BY d.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch departments" });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name, organization_id, manager_id } = req.body;
    if (!name) return res.status(400).json({ message: "Department name is required" });

    const result = await pool.query(
      `INSERT INTO departments (name, organization_id, manager_id) VALUES ($1, $2, $3) RETURNING *`,
      [name, organization_id || null, manager_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Failed to create department" });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, organization_id, manager_id } = req.body;

    const result = await pool.query(
      `UPDATE departments SET name = $1, organization_id = $2, manager_id = $3 WHERE id = $4 RETURNING *`,
      [name, organization_id || null, manager_id || null, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: "Department not found" });

    // Assign manager role to user if specified
    if (manager_id) {
      await pool.query(`UPDATE users SET role = 'manager' WHERE id = $1 AND role = 'user'`, [manager_id]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Failed to update department" });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM departments WHERE id = $1", [id]);
    res.json({ message: "Department deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete department" });
  }
};

module.exports = { getDepartments, createDepartment, updateDepartment, deleteDepartment };
