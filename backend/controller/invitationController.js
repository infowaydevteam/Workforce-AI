const pool = require("../db");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const sendInvitation = async (req, res) => {
  try {
    const { email, role, organization_id, team_id, department_id } = req.body;
    const invited_by = req.user.id;

    if (!email) return res.status(400).json({ message: "Email is required" });

    // Check if user already exists
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "User already registered with this email" });
    }

    // Check if pending invite exists
    const pendingInvite = await pool.query(
      "SELECT id FROM invitations WHERE email = $1 AND used = false AND expires_at > NOW()",
      [email]
    );
    if (pendingInvite.rows.length > 0) {
      return res.status(400).json({ message: "Active invitation already sent to this email" });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const result = await pool.query(
      `INSERT INTO invitations (email, token, role, organization_id, team_id, department_id, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [email, token, role || "user", organization_id || null, team_id || null, department_id || null, invited_by, expiresAt]
    );

    const inviteLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/invite/${token}`;

    res.status(201).json({
      message: "Invitation created",
      invitation: result.rows[0],
      invite_link: inviteLink,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create invitation" });
  }
};

const getInvitations = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, u.name AS invited_by_name,
             o.name AS organization_name,
             t.name AS team_name,
             d.name AS department_name
      FROM invitations i
      LEFT JOIN users u ON i.invited_by = u.id
      LEFT JOIN organizations o ON i.organization_id = o.id
      LEFT JOIN teams t ON i.team_id = t.id
      LEFT JOIN departments d ON i.department_id = d.id
      ORDER BY i.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch invitations" });
  }
};

const validateInviteToken = async (req, res) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      `SELECT i.*, o.name AS organization_name, t.name AS team_name, d.name AS department_name
       FROM invitations i
       LEFT JOIN organizations o ON i.organization_id = o.id
       LEFT JOIN teams t ON i.team_id = t.id
       LEFT JOIN departments d ON i.department_id = d.id
       WHERE i.token = $1 AND i.used = false AND i.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Invalid or expired invitation" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const acceptInvitation = async (req, res) => {
  const client = await pool.connect();
  try {
    const { token } = req.params;
    const { name, password } = req.body;

    if (!name || !password) return res.status(400).json({ message: "Name and password required" });

    await client.query("BEGIN");

    const invite = await client.query(
      "SELECT * FROM invitations WHERE token = $1 AND used = false AND expires_at > NOW()",
      [token]
    );

    if (invite.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Invalid or expired invitation" });
    }

    const inv = invite.rows[0];

    const existing = await client.query("SELECT id FROM users WHERE email = $1", [inv.email]);
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "User already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const agentToken = crypto.randomUUID();

    const userResult = await client.query(
      `INSERT INTO users (name, email, password, role, organization_id, team_id, department_id, agent_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, email, role`,
      [name, inv.email, hashedPassword, inv.role, inv.organization_id, inv.team_id, inv.department_id, agentToken]
    );

    await client.query("UPDATE invitations SET used = true WHERE id = $1", [inv.id]);

    await client.query("COMMIT");

    const user = userResult.rows[0];
    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "Registration complete",
      token: jwtToken,
      user,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Failed to accept invitation" });
  } finally {
    client.release();
  }
};

const deleteInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM invitations WHERE id = $1", [id]);
    res.json({ message: "Invitation deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete invitation" });
  }
};

module.exports = { sendInvitation, getInvitations, validateInviteToken, acceptInvitation, deleteInvitation };
