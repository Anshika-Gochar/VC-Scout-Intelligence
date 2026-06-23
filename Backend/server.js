import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import enrichRoutes from "./routes/enrichRoutes.js";
import listRoutes from "./routes/listRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";
import researchRoutes  from "./routes/researchRoutes.js";
import signalRoutes    from "./routes/signalRoutes.js";
import savedRoutes     from "./routes/savedRoutes.js";
import settingsRoutes  from "./routes/settingsRoutes.js";
import { protect } from "./middleware/auth.js";
import errorHandler from "./middleware/errorHandler.js";
import logger from "./utils/logger.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

dotenv.config();
connectDB();

const app = express();

// ── Security Headers ───────────────────────────────────────────────────────
app.use(helmet());

// ── Rate Limiters ──────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: "Too many requests from this IP, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

const researchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: "Too many research starts from this IP, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

const signalsRefreshLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: "Too many signals refreshes from this IP, please try again after an hour" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply limiters (restrictive routes first, then general limiter)
app.use("/api/research/start", researchLimiter);
app.use("/api/signals/refresh", signalsRefreshLimiter);
app.use("/api/", generalLimiter);

// ── CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : [
      "http://localhost:5173", 
      "http://127.0.0.1:5173",
      "http://localhost:5174", 
      "http://127.0.0.1:5174"
    ];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ── Body parser ────────────────────────────────────────────────────────────
app.use(express.json());

// ── Health check ───────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/companies", protect, companyRoutes);
app.use("/api/enrich", protect, enrichRoutes);
app.use("/api/lists", protect, listRoutes);
app.use("/api/notes", protect, noteRoutes);
app.use("/api/research",  researchRoutes);
app.use("/api/signals",   signalRoutes);           // GET public, POST refresh needs auth
app.use("/api/saved",     protect, savedRoutes);
app.use("/api/settings",  protect, settingsRoutes);

// ── 404 catch-all for unknown routes ───────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Global error handler (must be last) ────────────────────────────────────
app.use(errorHandler);

// ── Start server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`Health check → GET /api/health`);
});
