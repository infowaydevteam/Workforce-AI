const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendAgentEmail } = require("../middleware/emailService");
require("dotenv").config();
const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      organization_id,
      team_id,
    } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    // Agent Token Generate
    const agentToken = crypto.randomUUID();

    const newUser = await pool.query(
      `INSERT INTO users
      (
        name,
        email,
        password,
        role,
        organization_id,
        team_id,
        agent_token
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id, name, email, role, agent_token`,
      [
        name,
        email,
        hashedPassword,
        role,
        organization_id,
        team_id,
        agentToken,
      ]
    );

    // Download Link
    const downloadLink =
      `${process.env.API_BASE_URL}/api/agent/download-agent/${agentToken}`;

    // Email Send
    await sendAgentEmail({
      email,
      name,
      activationCode: agentToken,
      downloadLink,
    });

    res.status(201).json({
      message: "User created successfully",
      user: newUser.rows[0],
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await pool.query(
            "SELECT id, name, email, password, role FROM users WHERE email = $1",
            [email]
        );

        if (user.rows.length === 0) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const validPassword = await bcrypt.compare(
            password,
            user.rows[0].password
        );

        if (!validPassword) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            {
                id: user.rows[0].id,
                email: user.rows[0].email,
                role: user.rows[0].role,
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.rows[0].id,
                name: user.rows[0].name,
                email: user.rows[0].email,
                role: user.rows[0].role,
            },
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    register,
    login
};
