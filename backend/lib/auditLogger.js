import { pool, sql } from "../config/db.js";

async function safeInsert(params) {
  try {
    if (!pool) {
      console.warn(
        "Audit logger: DB pool not initialized yet, skipping audit insert"
      );
      return;
    }
    const r = pool.request();
    r.input("actor_id", sql.Int, params.actor_id || null);
    r.input("actor_username", sql.NVarChar(50), params.actor_username || null);
    r.input("actor_role", sql.NVarChar(50), params.actor_role || null);
    r.input("action_type", sql.NVarChar(100), params.action_type || null);
    r.input("target_type", sql.NVarChar(100), params.target_type || null);
    r.input("target_id", sql.Int, params.target_id || null);
    r.input("summary", sql.NVarChar(255), params.summary || null);
    r.input("details", sql.NVarChar(sql.MAX), params.details || null);
    r.input("ip_address", sql.NVarChar(45), params.ip_address || null);
    r.input("user_agent", sql.NVarChar(255), params.user_agent || null);

    await r.query(
      `INSERT INTO AuditLogs (actor_id, actor_username, actor_role, action_type, target_type, target_id, summary, details, ip_address, user_agent, created_at)
       VALUES (@actor_id, @actor_username, @actor_role, @action_type, @target_type, @target_id, @summary, @details, @ip_address, @user_agent, SYSUTCDATETIME())`
    );
  } catch (err) {
    console.error("Audit log insert failed:", err?.message || err);
  }
}

function getClientIp(req) {
  let ip =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    null;

  // Remove IPv6 prefix if present
  if (ip && ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }

  // Localhost mapping
  if (ip === "::1") {
    ip = "127.0.0.1";
  }

  return ip;
}

export async function logAction({
  req,
  actorId,
  actorUsername,
  actorRole,
  actionType,
  targetType,
  targetId,
  summary,
  details,
}) {
  // prefer req.user when available
  const actor_id = actorId || (req && req.user && req.user.id) || null;
  const actor_username =
    actorUsername || (req && req.user && req.user.username) || null;
  const actor_role = actorRole || (req && req.user && req.user.role) || null;

  const ip = (req && getClientIp(req)) || null;
  const ua = req && req.headers && (req.headers["user-agent"] || null);

  const payload = {
    actor_id,
    actor_username,
    actor_role,
    action_type: actionType,
    target_type: targetType,
    target_id: targetId || null,
    summary: summary || null,
    details: details ? JSON.stringify(details) : null,
    ip_address: ip,
    user_agent: ua,
  };

  // perform insert asynchronously but await to keep ordering during critical flows
  return safeInsert(payload);
}

export default { logAction };
