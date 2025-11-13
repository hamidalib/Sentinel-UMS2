import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

// Detect if server is a named instance
const isNamedInstance =
  process.env.DB_SERVER && process.env.DB_SERVER.includes("\\");

// Build database configuration
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER, // e.g. localhost\SQLEXPRESS
  database: process.env.DB_NAME,
  options: {
    trustServerCertificate: true,
    encrypt: false, // local connections
    enableArithAbort: true,
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
    console.log("✅ Connected to SQL Server successfully");
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    throw err;
  }
};

// Export the pool for routes to use
export { sql, pool };
