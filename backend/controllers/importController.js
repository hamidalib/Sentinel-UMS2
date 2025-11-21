// backend/controllers/importController.js
import { parse } from "csv-parse/sync";
import { pool, sql } from "../config/db.js";

/**
 * POST /api/records/import
 * Expects file in req.file (multer memoryStorage)
 * CSV columns expected (variants allowed):
 * username,password,dept,fullname,setup,setupcode,apptcode,remarks,ip_address
 */
export const importRecords = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "CSV file is required" });
    }

    const csvBuffer = req.file.buffer;
    const text = csvBuffer.toString("utf8");

    // Parse CSV (header -> columns)
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: "CSV contains no rows" });
    }

    // We'll collect success/failure info
    const successRows = [];
    const failedRows = [];

    // Pull existing usernames to avoid duplicate inserts and to do case-insensitive checks
    const existingRes = await pool
      .request()
      .query("SELECT username FROM Records");
    const existingUsernames = new Set(
      (existingRes.recordset || [])
        .map((r) => (r.username || "").toString().toLowerCase())
        .filter(Boolean)
    );
    // Track usernames seen in this CSV to detect duplicates within the file
    const seenInCsv = new Set();

    // Helper: sanitize strings (remove null/control bytes, trim, truncate)
    const sanitize = (v, maxLen) => {
      if (v === null || typeof v === "undefined") return "";
      let s = String(v);
      // Remove null bytes and non-printable control characters that can break TDS
      s = s
        .replace(/\0/g, "")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ")
        .trim();
      if (typeof maxLen === "number" && s.length > maxLen)
        s = s.slice(0, maxLen);
      return s;
    };

    // Insert rows individually so one failing row doesn't abort the entire import.
    for (let i = 0; i < records.length; i++) {
      const row = records[i];

      // Normalize header keys so we accept variations like "Appt Code", "appt_code", "ApptCode", etc.
      const normalized = {};
      Object.keys(row || {}).forEach((k) => {
        if (!k) return;
        const key = k
          .toString()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        normalized[key] = row[k];
      });

      const get = (...names) => {
        for (const n of names) {
          const key = n
            .toString()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
          if (
            typeof normalized[key] !== "undefined" &&
            normalized[key] !== null
          )
            return normalized[key];
          if (typeof row[n] !== "undefined" && row[n] !== null) return row[n];
        }
        return "";
      };

      // Sanitize and truncate to match DB column sizes. IPs typically fit within 45 chars (IPv6),
      // apptcode 50, username 50, dept 100, fullname 100, password 255.
      const username = sanitize(get("username", "user"), 50);
      const dept = sanitize(get("dept", "department"), 100);
      const fullname = sanitize(get("fullname", "full_name", "full name"), 100);
      const password = sanitize(get("password"), 255);
      const setup = sanitize(get("setup"), 100);
      const setupcode = sanitize(
        get("setupcode", "setup_code", "setup code"),
        50
      );
      const apptcode = sanitize(
        get("apptcode", "appt_code", "appt code", "apptcode"),
        50
      );
      const remarks = sanitize(get("remarks"));
      const ip_address = sanitize(
        get("ip_address", "ip address", "ip", "ipaddress"),
        45
      );

      // Skip if username empty
      if (!username) {
        failedRows.push({ rowNumber: i + 1, row, reason: "Missing username" });
        continue;
      }

      const usernameLower = username.toLowerCase();

      // Check duplicate: existing DB or earlier in CSV
      if (existingUsernames.has(usernameLower)) {
        failedRows.push({
          rowNumber: i + 1,
          row,
          reason: "Username already exists",
        });
        continue;
      }

      if (seenInCsv.has(usernameLower)) {
        failedRows.push({
          rowNumber: i + 1,
          row,
          reason: "Duplicate username in CSV",
        });
        continue;
      }

      // mark as seen (will be added to existing set after successful insert)
      seenInCsv.add(usernameLower);

      const r = pool.request();
      r.input("username", sql.NVarChar(50), username);
      r.input("password", sql.NVarChar(255), password);
      r.input("dept", sql.NVarChar(100), dept);
      r.input("fullname", sql.NVarChar(100), fullname);
      r.input("setup", sql.NVarChar(100), setup);
      r.input("setupcode", sql.NVarChar(50), setupcode);
      r.input("apptcode", sql.NVarChar(50), apptcode);
      r.input("remarks", sql.NVarChar(sql.MAX), remarks);
      r.input("ip_address", sql.NVarChar(45), ip_address);

      try {
        await r.query(
          `INSERT INTO Records
              (username, password, dept, fullname, setup, setupcode, apptcode, remarks, ip_address, created_at)
             VALUES
              (@username, @password, @dept, @fullname, @setup, @setupcode, @apptcode, @remarks, @ip_address, SYSUTCDATETIME())`
        );
        successRows.push({ rowNumber: i + 1, username });
        // add to existingUsernames so subsequent rows can't insert same username
        existingUsernames.add(usernameLower);
      } catch (rowErr) {
        // Log detailed row error to aid debugging
        console.error(`Row ${i + 1} insert failed:`, rowErr?.message || rowErr);
        failedRows.push({
          rowNumber: i + 1,
          row,
          reason: rowErr?.message || "DB insert error",
        });
      }
    }

    const response = {
      success: successRows.length,
      failed: failedRows.length,
      failedRows,
    };

    // Log summary of import
    try {
      const filename = fileNameFromReq(req);
      await logAction({
        req,
        actionType: "csv.import",
        targetType: "CSV",
        summary: `Imported ${successRows.length} rows`,
        details: {
          filename,
          totalRows: successRows.length + failedRows.length,
          successCount: successRows.length,
          failedCount: failedRows.length,
        },
      });
    } catch (e) {
      console.error("Failed to write audit log for import:", e?.message || e);
    }

    return res.json(response);
    // Log summary of import
    try {
      await importLog(
        req,
        successRows.length,
        failedRows.length,
        fileNameFromReq(req)
      );
    } catch (e) {
      console.error("Failed to write audit log for import:", e?.message || e);
    }
  } catch (err) {
    console.error("Import error:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

// Helper to extract filename and call audit logger
import { logAction } from "../lib/auditLogger.js";
function fileNameFromReq(req) {
  try {
    return req.file && (req.file.originalname || req.file.name)
      ? req.file.originalname || req.file.name
      : null;
  } catch (e) {
    return null;
  }
}

async function importLog(req, successCount, failedCount, filename) {
  const total = successCount + failedCount;
  const details = { filename, totalRows: total, successCount, failedCount };
  return logAction({
    req,
    actionType: "csv.import",
    targetType: "CSV",
    summary: `Imported ${successCount} rows`,
    details,
  });
}

/**
 * Preview import: parse CSV and return rows that would be duplicates or invalid
 * Does NOT perform any inserts.
 */
export const previewImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "CSV file is required" });
    }

    const csvBuffer = req.file.buffer;
    const text = csvBuffer.toString("utf8");

    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: "CSV contains no rows" });
    }

    // Pull existing usernames for duplicate detection (case-insensitive)
    const existingRes = await pool
      .request()
      .query("SELECT username FROM Records");
    const existingUsernames = new Set(
      (existingRes.recordset || [])
        .map((r) => (r.username || "").toString().toLowerCase())
        .filter(Boolean)
    );

    const seenInCsv = new Set();
    const duplicates = [];
    const missingUsername = [];

    const sanitize = (v, maxLen) => {
      if (v === null || typeof v === "undefined") return "";
      let s = String(v);
      s = s
        .replace(/\0/g, "")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ")
        .trim();
      if (typeof maxLen === "number" && s.length > maxLen)
        s = s.slice(0, maxLen);
      return s;
    };

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const normalized = {};
      Object.keys(row || {}).forEach((k) => {
        if (!k) return;
        const key = k
          .toString()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        normalized[key] = row[k];
      });

      const get = (...names) => {
        for (const n of names) {
          const key = n
            .toString()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
          if (
            typeof normalized[key] !== "undefined" &&
            normalized[key] !== null
          )
            return normalized[key];
          if (typeof row[n] !== "undefined" && row[n] !== null) return row[n];
        }
        return "";
      };

      const username = sanitize(get("username", "user"), 50);
      if (!username) {
        missingUsername.push({ rowNumber: i + 1, reason: "Missing username" });
        continue;
      }

      const lower = username.toLowerCase();
      if (existingUsernames.has(lower)) {
        duplicates.push({ rowNumber: i + 1, username });
        continue;
      }
      if (seenInCsv.has(lower)) {
        duplicates.push({
          rowNumber: i + 1,
          username,
          reason: "Duplicate in CSV",
        });
        continue;
      }
      seenInCsv.add(lower);
    }

    return res.json({
      totalRows: records.length,
      duplicates,
      missingUsername,
      insertable: records.length - duplicates.length - missingUsername.length,
    });
  } catch (err) {
    console.error("Preview import error:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err?.message });
  }
};
