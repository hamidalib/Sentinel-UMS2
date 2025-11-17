import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  // Check if JWT_SECRET is configured
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not configured in environment variables");
    return res.status(500).json({ error: "Server configuration error" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach decoded user info to request
    next();
  } catch (err) {
    console.error("JWT ERROR:", err.message);
    
    // Provide more specific error messages
    if (err.name === "TokenExpiredError") {
      return res.status(403).json({ 
        error: "Token expired. Please login again.",
        code: "TOKEN_EXPIRED"
      });
    } else if (err.name === "JsonWebTokenError") {
      return res.status(403).json({ 
        error: "Invalid token. Please login again.",
        code: "INVALID_TOKEN"
      });
    }
    
    return res.status(403).json({ 
      error: "Invalid or expired token",
      code: "AUTH_ERROR"
    });
  }
};
