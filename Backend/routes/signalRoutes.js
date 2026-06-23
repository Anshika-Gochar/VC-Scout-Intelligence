/**
 * signalRoutes.js — Market intelligence signal endpoints
 *
 * GET  /api/signals          — public (no auth) — returns cached or fresh signals
 * POST /api/signals/refresh  — auth required — force-regenerates signals
 */

import express from "express";
import { protect }              from "../middleware/auth.js";
import asyncWrapper             from "../middleware/asyncWrapper.js";
import Signal                   from "../models/Signal.js";
import {
  generateSignals,
  getValidCachedSignals,
} from "../services/signalGeneratorService.js";
import logger from "../utils/logger.js";

const router = express.Router();

// ── GET /api/signals ──────────────────────────────────────────────────────────
// Public — no auth. Returns cached 24h signals, or generates fresh ones.
// Query param: ?type=talent  (optional filter)
router.get(
  "/",
  asyncWrapper(async (req, res) => {
    const { type } = req.query;

    // Try to return cached non-expired signals
    const cached = await getValidCachedSignals(type || null);

    if (cached.length > 0) {
      logger.info(`[SignalRoutes] Serving ${cached.length} cached signals (filter: ${type || "all"})`);
      return res.json({
        signals:     cached,
        generatedAt: cached[0]?.generatedAt,
        cached:      true,
      });
    }

    // No valid cache — generate fresh
    logger.info("[SignalRoutes] No valid cache — generating fresh signals…");
    const fresh = await generateSignals();

    // Apply filter if requested
    const filtered = type
      ? fresh.filter((s) => s.type === type)
      : fresh;

    return res.json({
      signals:     filtered,
      generatedAt: new Date(),
      cached:      false,
    });
  })
);

// ── POST /api/signals/refresh ─────────────────────────────────────────────────
// Auth required — force-regenerates signals regardless of cache state.
router.post(
  "/refresh",
  protect,
  asyncWrapper(async (req, res) => {
    logger.info(`[SignalRoutes] Force refresh triggered by user ${req.user._id}`);

    // Delete all existing signals first
    await Signal.deleteMany({});

    const fresh = await generateSignals();

    return res.json({
      signals:     fresh,
      generatedAt: new Date(),
      cached:      false,
    });
  })
);

export default router;
