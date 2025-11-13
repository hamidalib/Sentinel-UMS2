import express from "express"; // ✅ Add express
import { pool, sql } from "../config/db.js"; // ✅ Use pool from db.js
import { verifyToken } from "../middleware/authMiddleware.js"; // ✅ Add middleware for authentication

const router = express.Router(); // ✅ Create router

/* -----------------------------------------------
   POST /api/entries/create → Add a new entry
------------------------------------------------ */
router.post("/create", verifyToken, async (req, res) => {
  const {
    username,
    password,
    dept,
    fullname,
    setup,
    setupcode,
    apptcode,
    remarks,
    ip_address,
  } = req.body;

  // Basic validation
  if (!username || !dept || !fullname) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const request = pool.request();
    request.input("username", sql.NVarChar(50), username);
    request.input("password", sql.NVarChar(255), password || null);
    request.input("dept", sql.NVarChar(100), dept);
    request.input("fullname", sql.NVarChar(100), fullname);
    request.input("setup", sql.NVarChar(100), setup || null);
    request.input("setupcode", sql.NVarChar(50), setupcode || null);
    request.input("apptcode", sql.NVarChar(50), apptcode || null);
    request.input("remarks", sql.NVarChar(sql.MAX), remarks || null);
    request.input("ip_address", sql.NVarChar(45), ip_address || null);

    await request.query(`
        INSERT INTO Records (username, password, dept, fullname, setup, setupcode, apptcode, remarks, ip_address, created_at)
        VALUES (@username, @password, @dept, @fullname, @setup, @setupcode, @apptcode, @remarks, @ip_address, GETDATE())
      `);

    res.status(201).json({ message: "Entry added successfully" });
  } catch (err) {
    console.error("Error adding entry:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* -----------------------------------------------
     GET /api/entries → Fetch all entries
  ------------------------------------------------ */
router.get("/", verifyToken, async (req, res) => {
  try {
    const result = await pool
      .request()
      .query("SELECT * FROM Records ORDER BY created_at DESC");

    // 2. Fetch the total number of users
    // NOTE: Replace 'Users' with your actual user table name if different.
    const totalRecordsResult = await pool
      .request()
      .query("SELECT COUNT(*) AS totalRecords FROM Records");

    res.json({
      records: result.recordset,
      totalRecords: totalRecordsResult.recordset[0].totalRecords,
    });
  } catch (err) {
    console.error("Error fetching Records:", err);

    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
