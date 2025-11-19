import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import recordRoutes from "./routes/recordRoutes.js";
import logRoutes from "./routes/logRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Server is running...");
});

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// ✅ Records API Routes
app.use("/api/records", recordRoutes);

// ROUTE REGISTRATION
// Changed to /api/users to match your Postman request
app.use("/api/users", authRoutes);
// Also keep /api/auth for backward compatibility if needed
app.use("/api/auth", authRoutes);
app.use("/api/logs", logRoutes);

// Connect Database and start server
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();

    // Start server after database connection is established
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API endpoint: http://localhost:${PORT}/api/users/create`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    // Still start the server, but database operations will fail
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(
        `🚀 Server running on port ${PORT} (Database connection failed)`
      );
      console.log(
        `⚠️  Database operations will not work until connection is established`
      );
    });
  }
};

startServer();
