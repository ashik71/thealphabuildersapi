import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/user.model.js";
dotenv.config();

// Verifies the JWT, then reloads the user from the database on every request.
// Authorization is decided from the DB row, never from claims baked into the
// token — so deactivating a user or changing their role takes effect
// immediately instead of whenever their token happens to expire.
export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token" });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const user = await User.findById(decoded.userId).select("-passwordHash");
  if (!user || !user.isActive) {
    return res.status(401).json({ message: "Account is no longer active" });
  }

  req.user = {
    userId: user._id.toString(),
    userName: user.name,
    email: user.email,
    role: user.role,
    isAdmin: user.isAdmin,
    shareholderId: user.shareholderId ? user.shareholderId.toString() : null,
  };

  next();
};
