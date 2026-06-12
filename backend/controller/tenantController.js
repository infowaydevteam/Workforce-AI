const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Company signup: creates tenant + first admin user
const companySignup = async (req, res) => {
  const client = await pool.connect();
  try {
    const { company_name, domain, admin_name, admin_email, admin_password } = req.body;

    if (!company_name || !admin_name || !admin_email || !admin_password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    await client.query("BEGIN");

    // Create tenant
    const tenantResult = await client.query(
      `INSERT INTO tenants (company_name, domain) VALUES ($1, $2) RETURNING *`,
      [company_name, domain || null]
    );
    const tenant = tenantResult.rows[0];

    // Check email uniqueness
    const existing = await client.query("SELECT id FROM users WHERE email = $1", [admin_email]);
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(admin_password, 10);
    const agentToken = crypto.randomUUID();

    const userResult = await client.query(
      `INSERT INTO users (name, email, password, role, tenant_id, agent_token)
       VALUES ($1, $2, $3, 'admin', $4, $5)
       RETURNING id, name, email, role, tenant_id`,
      [admin_name, admin_email, hashedPassword, tenant.id, agentToken]
    );

    await client.query("COMMIT");

    const user = userResult.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, tenant_id: tenant.id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "Company registered successfully",
      token,
      user,
      tenant,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Server error during company signup" });
  } finally {
    client.release();
  }
};

// Get tenant info
const getTenant = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    if (!tenant_id) return res.status(404).json({ message: "No tenant associated" });

    const result = await pool.query("SELECT * FROM tenants WHERE id = $1", [tenant_id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Tenant not found" });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { companySignup, getTenant };
