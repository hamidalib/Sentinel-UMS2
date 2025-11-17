// backend/routes/recordRoutes.js
import express from "express";
import { pool, sql } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import { importRecords } from "../controllers/importController.js"; // new controller

const router = express.Router();

// existing create route (unchanged)
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

// NEW: CSV import endpoint
// - multer middleware (single file 'file')
// - verifyToken to protect route
router.post("/import", verifyToken, upload.single("file"), async (req, res) => {
  // delegate to controller
  return importRecords(req, res);
});

// existing GET, PUT, DELETE routes follow (no change)
router.get("/", verifyToken, async (req, res) => {
  try {
    const result = await pool
      .request()
      .query("SELECT * FROM Records ORDER BY created_at DESC");
    const totalRecordsResult = await pool
      .request()
      .query("SELECT COUNT(*) AS totalRecords FROM Records");
    const newUsersResult = await pool
      .request()
      .query(
        "SELECT COUNT(*) AS newUsersLast7Days FROM Records WHERE created_at >= DATEADD(day, -7, GETDATE())"
      );

    res.json({
      records: result.recordset,
      totalRecords: totalRecordsResult.recordset[0].totalRecords,
      newUsersLast7Days:
        (newUsersResult && newUsersResult.recordset[0].newUsersLast7Days) || 0,
    });
  } catch (err) {
    console.error("Error fetching Records:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /:id and DELETE /:id unchanged - keep as you have them
router.put("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
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

  try {
    // Fetch existing password to avoid overwriting with NULL
    const existingReq = pool.request();
    existingReq.input("id", sql.Int, id);
    const existingRes = await existingReq.query(
      "SELECT password FROM Records WHERE id = @id"
    );
    const existingPassword =
      existingRes.recordset && existingRes.recordset[0]
        ? existingRes.recordset[0].password
        : null;

    const request = pool.request();
    request.input("id", sql.Int, id);
    request.input("username", sql.NVarChar(50), username || null);
    request.input(
      "password",
      sql.NVarChar(255),
      typeof password !== "undefined" && password !== null && password !== ""
        ? password
        : existingPassword
    );
    request.input("dept", sql.NVarChar(100), dept || null);
    request.input("fullname", sql.NVarChar(100), fullname || null);
    request.input("setup", sql.NVarChar(100), setup || null);
    request.input("setupcode", sql.NVarChar(50), setupcode || null);
    request.input("apptcode", sql.NVarChar(50), apptcode || null);
    request.input("remarks", sql.NVarChar(sql.MAX), remarks || null);
    request.input("ip_address", sql.NVarChar(45), ip_address || null);

    const updateQuery = `
      UPDATE Records
      SET username = @username,
          password = @password,
          dept = @dept,
          fullname = @fullname,
          setup = @setup,
          setupcode = @setupcode,
          apptcode = @apptcode,
          remarks = @remarks,
          ip_address = @ip_address
      WHERE id = @id
    `;

    await request.query(updateQuery);

    return res.json({ message: "Record updated" });
  } catch (err) {
    console.error(
      "Error updating record:",
      err?.message || err,
      err?.stack || ""
    );
    return res
      .status(500)
      .json({ error: "Failed to update record", details: err?.message });
  }
});

router.delete("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const request = pool.request();
    request.input("id", sql.Int, id);
    await request.query("DELETE FROM Records WHERE id = @id");
    return res.json({ message: "Record deleted" });
  } catch (err) {
    console.error(
      "Error deleting record:",
      err?.message || err,
      err?.stack || ""
    );
    return res
      .status(500)
      .json({ error: "Failed to delete record", details: err?.message });
  }
});

export default router;
