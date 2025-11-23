import express from "express";
import bcrypt from "bcryptjs";
import { pool, sql } from "../config/db.js"; // ✅ Use pool from db.js
import jwt from "jsonwebtoken"; // ✅ Add JWT for authentication
import { verifyToken } from "../middleware/authMiddleware.js"; // ✅ Add middleware for authentication
import { logAction } from "../lib/auditLogger.js";

const router = express.Router();

// POST /api/users/create
router.post("/create", verifyToken, async (req, res) => {
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

    const insertRes = await request.query(
      `INSERT INTO Users (username, password_hash, role, created_at)
       OUTPUT INSERTED.id AS id
       VALUES (@username, @password_hash, @role, SYSUTCDATETIME())`
    );
    const insertedId =
      insertRes.recordset && insertRes.recordset[0]
        ? insertRes.recordset[0].id
        : null;

    // Log creation
    try {
      const { logAction } = await import("../lib/auditLogger.js");
      await logAction({
        req,
        actionType: "admin.create",
        targetType: "User",
        targetId: insertedId,
        summary: `username: ${username}`,
        details: { role },
      });
    } catch (e) {
      console.error(
        "Failed to write audit log for admin create:",
        e?.message || e
      );
    }

    res
      .status(201)
      .json({ message: "User created successfully", id: insertedId });
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
    return res.status(500).json({ error: "Failed to fetch admin user count" });
  }
});

// ✅ POST /api/users/login
// Logs in a user and returns a JWT token

router.post("/login", async (req, res) => {
  // Be defensive: ensure a JSON body was provided
  if (!req.body || typeof req.body !== "object") {
    return res
      .status(400)
      .json({
        error:
          "Request body missing or invalid. Send JSON { username, password }",
      });
  }

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  try {
    if (!pool || typeof pool.request !== "function") {
      console.error("LOGIN ERROR: database pool is not available");
      return res.status(503).json({ error: "Database not connected" });
    }

    const request = pool.request();
    request.input("username", sql.NVarChar(50), username);

    const result = await request.query(`
      SELECT id, username, password_hash, role FROM Users WHERE username = @username
    `);

    // Check if user exists
    if (result.recordset.length === 0) {
      // Log failed login attempt (unknown user)
      try {
        const { logAction } = await import("../lib/auditLogger.js");
        await logAction({
          req,
          actorUsername: username,
          actionType: "auth.login",
          summary: `Login failed for ${username}`,
          details: { success: false, reason: "user_not_found" },
        });
      } catch (e) {
        console.error(
          "Failed to write audit log for failed login (user not found):",
          e?.message || e
        );
      }
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = result.recordset[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      // Log failed login attempt (bad password)
      try {
        const { logAction } = await import("../lib/auditLogger.js");
        await logAction({
          req,
          actorId: user.id,
          actorUsername: user.username,
          actionType: "auth.login",
          summary: `Login failed for ${user.username}`,
          details: { success: false, reason: "bad_password" },
        });
      } catch (e) {
        console.error(
          "Failed to write audit log for failed login (bad password):",
          e?.message || e
        );
      }
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

    // Log successful login
    try {
      const { logAction } = await import("../lib/auditLogger.js");
      await logAction({
        req,
        actorId: user.id,
        actionType: "auth.login",
        summary: `Login successful for ${user.username}`,
        details: { success: true },
      });
    } catch (e) {
      console.error("Failed to write audit log for login:", e?.message || e);
    }

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

    const newToken = jwt.sign({ id, username, role }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ token: newToken });
  } catch (err) {
    console.error("TOKEN REFRESH ERROR:", err);
    res.status(500).json({ error: "Unable to refresh token" });
  }
});

export default router;

// Add update and delete endpoints for admin users
// PUT /api/users/:id  -> update username, role, and optionally password
router.put("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { username, password, role } = req.body;

  try {
    // Fetch existing user to preserve fields if not provided
    const existingReq = pool.request();
    existingReq.input("id", sql.Int, id);
    const existingRes = await existingReq.query(
      "SELECT username, password_hash, role FROM Users WHERE id = @id"
    );
    const existing =
      existingRes.recordset && existingRes.recordset[0]
        ? existingRes.recordset[0]
        : null;

    const existingHash = existing ? existing.password_hash : null;
    const existingUsername = existing ? existing.username : null;
    const existingRole = existing ? existing.role : null;

    let passwordHash = existingHash;
    if (
      typeof password !== "undefined" &&
      password !== null &&
      password !== ""
    ) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const request = pool.request();
    request.input("id", sql.Int, id);
    // Preserve username/role if not provided to avoid writing NULL into NOT NULL columns
    request.input(
      "username",
      sql.NVarChar(50),
      typeof username !== "undefined" && username !== null && username !== ""
        ? username
        : existingUsername
    );
    request.input("password_hash", sql.NVarChar(255), passwordHash || null);
    request.input(
      "role",
      sql.NVarChar(50),
      typeof role !== "undefined" && role !== null && role !== ""
        ? role
        : existingRole
    );

    const updateQuery = `
      UPDATE Users
      SET username = @username,
          password_hash = @password_hash,
          role = @role
      WHERE id = @id
    `;

    await request.query(updateQuery);
    return res.json({ message: "User updated" });
  } catch (err) {
    console.error("Error updating user:", err);
    return res.status(500).json({
      error: "Failed to update user",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// DELETE /api/users/:id -> delete user
router.delete("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Fetch existing user for logging
    const selReq = pool.request();
    selReq.input("id", sql.Int, id);
    const selRes = await selReq.query(
      "SELECT id, username, role FROM Users WHERE id = @id"
    );
    const existing =
      selRes.recordset && selRes.recordset[0] ? selRes.recordset[0] : null;

    if (!existing) return res.status(404).json({ error: "User not found" });

    const request = pool.request();
    request.input("id", sql.Int, id);
    await request.query("DELETE FROM Users WHERE id = @id");

    try {
      await logAction({
        req,
        actionType: "admin.delete",
        targetType: "User",
        targetId: parseInt(id, 10),
        summary: `Deleted admin ${existing.username}`,
        details: { username: existing.username, role: existing.role },
      });
    } catch (e) {
      console.error(
        "Failed to write audit log for admin delete:",
        e?.message || e
      );
    }

    return res.json({ message: "User deleted" });
  } catch (err) {
    console.error("Error deleting user:", err);
    return res.status(500).json({ error: "Failed to delete user" });
  }
});
