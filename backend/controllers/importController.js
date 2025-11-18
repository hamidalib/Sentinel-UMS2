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
              (@username, @password, @dept, @fullname, @setup, @setupcode, @apptcode, @remarks, @ip_address, GETDATE())`
        );
        successRows.push({ rowNumber: i + 1, username });
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

    return res.json({
      success: successRows.length,
      failed: failedRows.length,
      failedRows,
    });
  } catch (err) {
    console.error("Import error:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};
