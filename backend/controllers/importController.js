// backend/controllers/importController.js
import { parse } from "csv-parse/sync";
import { pool, sql } from "../config/db.js";

/**
 * POST /api/records/import
 * Expects file in req.file (multer memoryStorage)
 * CSV columns expected:
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

    // Use transaction for safer inserts
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      const request = tx.request();

      // Prepare a parameterised insert statement once (named parameters used per-row)
      // We'll perform row-by-row inserts (fine for small/medium CSV). For large CSVs, implement bulk/batched inserts.
      for (let i = 0; i < records.length; i++) {
        const row = records[i];

        // Accept every row: coerce missing fields to safe defaults so DB non-null
        // constraints are not tripped. Use empty string for text fields by default.
        const username = (row.username || row.user || row.Username || "").toString();
        const dept = (row.dept || row.department || row.Dept || "").toString();
        const fullname = (row.fullname || row.full_name || row.FullName || "").toString();
        const password = (row.password || "").toString();
        const setup = (row.setup || "").toString();
        const setupcode = (row.setupcode || "").toString();
        const apptcode = (row.apptcode || "").toString();
        const remarks = (row.remarks || "").toString();
        const ip_address = (row.ip_address || "").toString();

        // Set inputs (using new request for each row to avoid parameter bleed)
        const r = tx.request();
        r.input("username", sql.NVarChar(50), username);
        // default password to empty string rather than NULL to avoid NOT NULL errors
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
          failedRows.push({
            rowNumber: i + 1,
            row,
            reason: rowErr?.message || "DB insert error",
          });
        }
      }

      // commit transaction
      await tx.commit();
    } catch (txErr) {
      // rollback on transaction-level error
      await tx.rollback();
      console.error("Transaction failed:", txErr);
      return res
        .status(500)
        .json({
          error: "Import failed (transaction error)",
          details: txErr.message,
        });
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
