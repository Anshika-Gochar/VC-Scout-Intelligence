/**
 * settingsRoutes.js — Settings / configuration status endpoints
 *
 * GET /api/settings/status — returns which API keys are configured
 *                            NEVER returns actual key values.
 *
 * Mounted under /api/settings in server.js (with protect middleware).
 */

import express     from "express";
import asyncWrapper from "../middleware/asyncWrapper.js";

const router = express.Router();

// ── GET /api/settings/status ──────────────────────────────────────────────────
router.get(
  "/status",
  asyncWrapper(async (_req, res) => {
    const geminiKey    = process.env.GEMINI_API_KEY    || "";
    const firecrawlKey = process.env.FIRECRAWL_API_KEY || "";

    return res.json({
      gemini: {
        configured: geminiKey.length > 10,
        // Never expose the key — only length-based hint for UX
        keyHint: geminiKey.length > 10
          ? `${geminiKey.slice(0, 4)}${"•".repeat(16)}`
          : null,
      },
      firecrawl: {
        configured: firecrawlKey.length > 10,
        keyHint: firecrawlKey.length > 10
          ? `${firecrawlKey.slice(0, 4)}${"•".repeat(16)}`
          : null,
      },
    });
  })
);

export default router;
