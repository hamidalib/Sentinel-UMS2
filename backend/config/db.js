import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

// Detect if server is a named instance
const isNamedInstance =
  process.env.DB_SERVER && process.env.DB_SERVER.includes("\\");

// Build database configuration
// Parse server/instance when DB_SERVER contains a named instance (e.g. HOST\\SQLEXPRESS)
let serverHost = process.env.DB_SERVER || "";
let instanceName = undefined;
if (serverHost.includes("\\")) {
  const parts = serverHost.split("\\\\");
  serverHost = parts[0];
  instanceName = parts.slice(1).join("\\");
}

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: serverHost, // host portion; instanceName (if present) goes into options
  database: process.env.DB_NAME,
  options: {
    trustServerCertificate: true,
    encrypt: false, // local connections
    enableArithAbort: true,
    ...(instanceName ? { instanceName } : {}),
  },
};

// Only add port for default instances
if (process.env.DB_PORT && !isNamedInstance) {
  const port = parseInt(process.env.DB_PORT);
  if (!isNaN(port)) dbConfig.port = port;
}

let pool; // this will hold the connected pool

export const connectDB = async () => {
  try {
    // Validate required env variables
    if (
      !process.env.DB_USER ||
      !process.env.DB_PASS ||
      !process.env.DB_SERVER ||
      !process.env.DB_NAME
    ) {
      throw new Error(
        "Missing required database environment variables. Check your .env file."
      );
    }

    console.log("Attempting to connect to SQL Server...");
    console.log(`Server: ${process.env.DB_SERVER}`);
    console.log(`Database: ${process.env.DB_NAME}`);
    console.log(`User: ${process.env.DB_USER}`);
    if (isNamedInstance) {
      console.log(
        "ℹ️ Using named instance - SQL Server Browser service must be running"
      );
    } else if (dbConfig.port) {
      console.log(`Port: ${dbConfig.port}`);
    }

    // Connect and store pool
    pool = await sql.connect(dbConfig);
    // Ensure AuditLogs table exists (idempotent)
    try {
      const createAuditSql = `
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AuditLogs]') AND type in (N'U'))
        BEGIN
          CREATE TABLE [dbo].[AuditLogs] (
            [id] INT IDENTITY(1,1) PRIMARY KEY,
            [created_at] DATETIME NOT NULL DEFAULT GETDATE(),
            [actor_id] INT NULL,
            [actor_username] NVARCHAR(50) NULL,
            [actor_role] NVARCHAR(50) NULL,
            [action_type] NVARCHAR(100) NOT NULL,
            [target_type] NVARCHAR(100) NULL,
            [target_id] INT NULL,
            [summary] NVARCHAR(255) NULL,
            [details] NVARCHAR(MAX) NULL,
            [ip_address] NVARCHAR(45) NULL,
            [user_agent] NVARCHAR(255) NULL
          );
        END
        IF NOT EXISTS (
          SELECT * FROM sys.indexes i
          WHERE i.name = 'IX_AuditLogs_created_at' AND i.object_id = OBJECT_ID(N'[dbo].[AuditLogs]')
        )
        BEGIN
          CREATE INDEX IX_AuditLogs_created_at ON [dbo].[AuditLogs]([created_at] DESC);
        END`;

      await pool.request().query(createAuditSql);
      console.log("AuditLogs table exists or was created");
    } catch (ddlErr) {
      console.warn(
        "Could not ensure AuditLogs table exists:",
        ddlErr.message || ddlErr
      );
    }
    console.log("✅ Connected to SQL Server successfully");
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    throw err;
  }
};

// Export the pool for routes to use
export { sql, pool };
