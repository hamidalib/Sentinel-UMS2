import express from "express";
import { pool, sql } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/logs?page=1&pageSize=20&action=auth.login&actor=alice&from=2025-01-01&to=2025-12-31
router.get("/", verifyToken, async (req, res) => {
  try {
    // Simple role check: any admin (role present) can view
    const { role } = req.user || {};
    if (!role) return res.status(403).json({ error: "Forbidden" });

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    let pageSize = Math.min(
      200,
      Math.max(1, parseInt(req.query.pageSize || "25", 10))
    );
    const all = req.query.all === "true" || req.query.all === "1";
    // If client requests all, allow a larger safe cap but avoid unbounded responses
    if (all) {
      pageSize = 5000; // safe upper bound for 'all' requests
    }
    const offset = all ? 0 : (page - 1) * pageSize;

    const filters = [];
    const inputs = {};

    if (req.query.action) {
      filters.push("action_type = @action");
      inputs.action = req.query.action;
    }
    if (req.query.actor) {
      filters.push("actor_username LIKE @actor");
      inputs.actor = `%${req.query.actor}%`;
    }
    if (req.query.from) {
      filters.push("created_at >= @from");
      inputs.from = req.query.from;
    }
    if (req.query.to) {
      filters.push("created_at <= @to");
      inputs.to = req.query.to;
    }

    const where = filters.length > 0 ? "WHERE " + filters.join(" AND ") : "";

    const totalReq = pool.request();
    Object.keys(inputs).forEach((k) =>
      totalReq.input(k, sql.NVarChar(255), inputs[k])
    );
    const totalRes = await totalReq.query(
      `SELECT COUNT(*) AS total FROM AuditLogs ${where}`
    );
    const total =
      totalRes.recordset && totalRes.recordset[0]
        ? totalRes.recordset[0].total
        : 0;

    const reqQ = pool.request();
    Object.keys(inputs).forEach((k) =>
      reqQ.input(k, sql.NVarChar(255), inputs[k])
    );
    reqQ.input("offset", sql.Int, offset);
    reqQ.input("limit", sql.Int, pageSize);

    const q = `SELECT TOP(@limit) * FROM AuditLogs ${where} ORDER BY created_at DESC OFFSET @offset ROWS`; // OFFSET requires ORDER BY in SQL Server; TOP used for simplicity
    // Use a safer query: select with order and offset/fetch
    const finalQ = `SELECT * FROM AuditLogs ${where} ORDER BY created_at DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    const result = await reqQ.query(finalQ);

    return res.json({ total, page, pageSize, logs: result.recordset || [] });
  } catch (err) {
    console.error("Error fetching logs:", err);
    if (err && err.stack) console.error(err.stack);
    // In development include error details to help debugging
    if (process.env.NODE_ENV === "development") {
      return res.status(500).json({
        error: "Internal server error",
        details: err.message || String(err),
      });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
