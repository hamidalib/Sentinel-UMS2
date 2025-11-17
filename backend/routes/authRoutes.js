import express from "express";
import bcrypt from "bcryptjs";
import { pool, sql } from "../config/db.js"; // ✅ Use pool from db.js
import jwt from "jsonwebtoken"; // ✅ Add JWT for authentication
import { verifyToken } from "../middleware/authMiddleware.js"; // ✅ Add middleware for authentication

const router = express.Router();

// POST /api/users/create
router.post("/create", async (req, res) => {
  console.log("Request body received:", req.body);

  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // SQL query
    const query = `
      INSERT INTO Users (username, password_hash, role, created_at)
      VALUES (@username, @password_hash, @role, GETDATE())
    `;

    // ✅ Use connected pool
    const request = pool.request();
    request.input("username", sql.NVarChar(50), username);
    request.input("password_hash", sql.NVarChar(255), hashedPassword);
    request.input("role", sql.NVarChar(50), role);

    await request.query(query);

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.error("Full error:", err);

    // Duplicate username
    if (err.number === 2627 || err.number === 2601) {
      return res.status(409).json({
        error: "User already exists",
        details: "A user with this username already exists.",
      });
    }

    // Table doesn't exist
    if (err.number === 208) {
      return res.status(500).json({
        error: "Database table not found",
        details: "The Users table does not exist. Please create it first.",
      });
    }

    // SQL connection errors
    if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
      return res.status(503).json({
        error: "Database connection failed",
        details:
          "Cannot connect to the database. Please check if SQL Server is running.",
      });
    }

    // Default internal server error
    res.status(500).json({
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

/* ---------------------------
   GET /api/users
   Return all users (without password_hash)
   --------------------------- */
router.get("/", verifyToken, async (req, res) => {
  try {
    const pool = await sql.connect();
    const result = await pool
      .request()
      .query("SELECT id, username, role, created_at FROM Users");

    return res.json(result.recordset);
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/users/count - total admin users
router.get("/count", verifyToken, async (req, res) => {
  try {
    const result = await pool
      .request()
      .query("SELECT COUNT(*) AS totalAdmins FROM Users");

    return res.json({ totalAdmins: result.recordset[0].totalAdmins || 0 });
  } catch (err) {
    console.error("ADMIN COUNT ERROR:", err);
    return res
      .status(500)
      .json({ error: "Failed to fetch admin user count" });
  }
});

// ✅ POST /api/users/login
// Logs in a user and returns a JWT token

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  try {
    const request = pool.request();
    request.input("username", sql.NVarChar(50), username);

    const result = await request.query(`
      SELECT id, username, password_hash, role FROM Users WHERE username = @username
    `);

    // Check if user exists
    if (result.recordset.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = result.recordset[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" } // token valid for 1 hour
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/users/refresh - issue a new token before expiry
router.post("/refresh", verifyToken, async (req, res) => {
  try {
    const { id, username, role } = req.user;

    const newToken = jwt.sign(
      { id, username, role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token: newToken });
  } catch (err) {
    console.error("TOKEN REFRESH ERROR:", err);
    res.status(500).json({ error: "Unable to refresh token" });
  }
});

export default router;
