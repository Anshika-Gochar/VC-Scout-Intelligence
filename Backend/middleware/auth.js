import jwt from "jsonwebtoken";
import User from "../models/User.js";
import asyncWrapper from "./asyncWrapper.js";

export const protect = asyncWrapper(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ error: "Not authorized to access this route" });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_key_12345");

    // Fetch user and attach to request object
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "User not found with this token" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Not authorized to access this route" });
  }
});
