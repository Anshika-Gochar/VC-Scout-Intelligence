import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import asyncWrapper from "../middleware/asyncWrapper.js";

const router = express.Router();

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "fallback_secret_key_12345", {
    expiresIn: "30d",
  });
};

// ── POST /api/auth/register — Email registration ──────────────────────────
router.post(
  "/register",
  asyncWrapper(async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Please provide name, email, and password" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || "General Partner",
      provider: "local"
    });

    const token = signToken(user._id);

    res.status(201).json({
      token,
      user: user.toSafeObject(),
    });
  })
);

// ── POST /api/auth/login — Email login ─────────────────────────────────────
router.post(
  "/login",
  asyncWrapper(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Please provide email and password" });
    }

    // Find user and explicitly select password
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user._id);

    res.json({
      token,
      user: user.toSafeObject(),
    });
  })
);

// ── POST /api/auth/oauth — OAuth login/registration ────────────────────────
router.post(
  "/oauth",
  asyncWrapper(async (req, res) => {
    const { email, name, provider, providerId, avatar } = req.body;

    if (!email || !provider || !providerId) {
      return res.status(400).json({ error: "Please provide email, provider, and providerId" });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // If user exists but is local, we can link/update their provider info
      if (user.provider === "local") {
        user.provider = provider;
        user.providerId = providerId;
        if (avatar && !user.avatar) user.avatar = avatar;
        await user.save();
      }
    } else {
      // Create a new OAuth user
      user = await User.create({
        name: name || email.split("@")[0] || "OAuth User",
        email,
        provider,
        providerId,
        avatar: avatar || "",
        role: "General Partner"
      });
    }

    const token = signToken(user._id);

    res.json({
      token,
      user: user.toSafeObject(),
    });
  })
);

// ── GET /api/auth/me — Get current user profile ─────────────────────────────
router.get(
  "/me",
  protect,
  asyncWrapper(async (req, res) => {
    res.json({
      user: req.user.toSafeObject(),
    });
  })
);

export default router;
