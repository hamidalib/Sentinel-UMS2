// backend/routes/recordRoutes.js
import express from "express";
import { pool, sql } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import { importRecords } from "../controllers/importController.js"; // new controller
import { logAction } from "../lib/auditLogger.js";

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
    // Check for existing username to enforce uniqueness
    const checkReq = pool.request();
    checkReq.input("username", sql.NVarChar(50), username);
    const checkRes = await checkReq.query(
      "SELECT COUNT(*) AS cnt FROM Records WHERE username = @username"
    );
    const exists =
      checkRes.recordset &&
      checkRes.recordset[0] &&
      checkRes.recordset[0].cnt > 0;
    if (exists) {
      return res.status(409).json({ error: "Username already exists" });
    }

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

    // Insert and return inserted id
    const insertRes = await request.query(
      `INSERT INTO Records (username, password, dept, fullname, setup, setupcode, apptcode, remarks, ip_address, created_at)
       OUTPUT INSERTED.id AS id
       VALUES (@username, @password, @dept, @fullname, @setup, @setupcode, @apptcode, @remarks, @ip_address, SYSUTCDATETIME())`
    );

    const insertedId =
      insertRes.recordset && insertRes.recordset[0]
        ? insertRes.recordset[0].id
        : null;

    // Log the creation
    try {
      await logAction({
        req,
        actionType: "sentinel.create",
        targetType: "Record",
        targetId: insertedId,
        summary: `username: ${username}`,
        details: { setupcode, dept, fullname },
      });
    } catch (e) {
      console.error(
        "Failed to write audit log for record create:",
        e?.message || e
      );
    }

    res
      .status(201)
      .json({ message: "Entry added successfully", id: insertedId });
  } catch (err) {
    console.error("Error adding entry:", err);
    // Handle unique constraint/race-condition duplicates gracefully
    const code = err?.number || err?.code;
    if (
      code === 2627 ||
      code === 2601 ||
      /UQ_Records_Username/i.test(err?.message || "")
    ) {
      return res.status(409).json({ error: "Username already exists" });
    }
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

// Preview import: returns duplicates/missing rows without inserting
import { previewImport } from "../controllers/importController.js";
router.post(
  "/import/preview",
  verifyToken,
  upload.single("file"),
  async (req, res) => {
    return previewImport(req, res);
  }
);

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
        "SELECT COUNT(*) AS newUsersLast7Days FROM Records WHERE created_at >= DATEADD(day, -7, SYSUTCDATETIME())"
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
    // Fetch existing row to produce a before snapshot and preserve values
    const existingReq = pool.request();
    existingReq.input("id", sql.Int, id);
    const existingRes = await existingReq.query(
      "SELECT * FROM Records WHERE id = @id"
    );
    const existing =
      existingRes.recordset && existingRes.recordset[0]
        ? existingRes.recordset[0]
        : null;

    const existingPassword = existing ? existing.password : null;
    const existingUsername = existing ? existing.username : null;

    const request = pool.request();
    request.input("id", sql.Int, id);
    // Preserve existing values when fields are not provided
    const newUsername =
      typeof username !== "undefined" && username !== null && username !== ""
        ? username
        : existingUsername;
    request.input("username", sql.NVarChar(50), newUsername);
    const newPassword =
      typeof password !== "undefined" && password !== null && password !== ""
        ? password
        : existingPassword;
    request.input("password", sql.NVarChar(255), newPassword);
    const newDept =
      typeof dept !== "undefined" && dept !== null
        ? dept
        : existing
        ? existing.dept
        : null;
    request.input("dept", sql.NVarChar(100), newDept);
    const newFullname =
      typeof fullname !== "undefined" && fullname !== null
        ? fullname
        : existing
        ? existing.fullname
        : null;
    request.input("fullname", sql.NVarChar(100), newFullname);
    const newSetup =
      typeof setup !== "undefined" && setup !== null
        ? setup
        : existing
        ? existing.setup
        : null;
    request.input("setup", sql.NVarChar(100), newSetup);
    const newSetupcode =
      typeof setupcode !== "undefined" && setupcode !== null
        ? setupcode
        : existing
        ? existing.setupcode
        : null;
    request.input("setupcode", sql.NVarChar(50), newSetupcode);
    const newApptcode =
      typeof apptcode !== "undefined" && apptcode !== null
        ? apptcode
        : existing
        ? existing.apptcode
        : null;
    request.input("apptcode", sql.NVarChar(50), newApptcode);
    const newRemarks =
      typeof remarks !== "undefined" && remarks !== null
        ? remarks
        : existing
        ? existing.remarks
        : null;
    request.input("remarks", sql.NVarChar(sql.MAX), newRemarks);
    const newIp =
      typeof ip_address !== "undefined" && ip_address !== null
        ? ip_address
        : existing
        ? existing.ip_address
        : null;
    request.input("ip_address", sql.NVarChar(45), newIp);

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

    // Prepare an audit entry (omit logging raw passwords)
    try {
      const before = existing
        ? {
            username: existing.username,
            dept: existing.dept,
            fullname: existing.fullname,
            setupcode: existing.setupcode,
            apptcode: existing.apptcode,
            remarks: existing.remarks,
          }
        : null;

      const after = {
        username: newUsername,
        dept: newDept,
        fullname: newFullname,
        setupcode: newSetupcode,
        apptcode: newApptcode,
        remarks: newRemarks,
      };

      const passwordChanged = existingPassword !== newPassword;

      await logAction({
        req,
        actionType: "sentinel.update",
        targetType: "Record",
        targetId: parseInt(id, 10),
        summary: `Updated record ${id}`,
        details: { before, after, passwordChanged },
      });
    } catch (logErr) {
      console.error(
        "Failed to write audit log for record update:",
        logErr?.message || logErr
      );
    }

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
    // Fetch the existing record for logging
    const selReq = pool.request();
    selReq.input("id", sql.Int, id);
    const selRes = await selReq.query(
      "SELECT id, username, dept, fullname FROM Records WHERE id = @id"
    );
    const existing =
      selRes.recordset && selRes.recordset[0] ? selRes.recordset[0] : null;

    if (!existing) {
      return res.status(404).json({ error: "Record not found" });
    }

    const request = pool.request();
    request.input("id", sql.Int, id);
    await request.query("DELETE FROM Records WHERE id = @id");

    try {
      await logAction({
        req,
        actionType: "sentinel.delete",
        targetType: "Record",
        targetId: parseInt(id, 10),
        summary: `Deleted record ${existing.username || id}`,
        details: {
          username: existing.username,
          dept: existing.dept,
          fullname: existing.fullname,
        },
      });
    } catch (e) {
      console.error(
        "Failed to write audit log for record delete:",
        e?.message || e
      );
    }

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
