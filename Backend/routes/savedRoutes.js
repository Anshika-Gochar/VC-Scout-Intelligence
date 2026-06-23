/**
 * savedRoutes.js — Saved memo bookmark endpoints
 *
 * POST   /api/saved                  — save a memo to a list
 * GET    /api/saved                  — list all saved memos grouped by listName
 * DELETE /api/saved/:savedMemoId     — remove a saved memo
 * GET    /api/saved/lists            — get distinct listNames for user
 *
 * All routes require auth (mounted under protect in server.js).
 */

import express from "express";
import asyncWrapper from "../middleware/asyncWrapper.js";
import SavedMemo    from "../models/SavedMemo.js";
import logger       from "../utils/logger.js";

const router = express.Router();

// ── GET /api/saved/lists ──────────────────────────────────────────────────────
// Must be defined BEFORE /:savedMemoId to avoid route conflict
router.get(
  "/lists",
  asyncWrapper(async (req, res) => {
    const lists = await SavedMemo.distinct("listName", { userId: req.user._id });
    return res.json({ lists: lists.sort() });
  })
);

// ── POST /api/saved ───────────────────────────────────────────────────────────
router.post(
  "/",
  asyncWrapper(async (req, res) => {
    const { memoId, listName = "Default", notes = "" } = req.body;

    if (!memoId) {
      return res.status(400).json({ error: "memoId is required." });
    }

    // Check for duplicate
    const existing = await SavedMemo.findOne({
      userId: req.user._id,
      memoId,
    });

    if (existing) {
      return res.json({ alreadySaved: true, savedMemo: existing });
    }

    const savedMemo = await SavedMemo.create({
      userId:   req.user._id,
      memoId,
      listName: listName.trim() || "Default",
      notes:    notes.trim(),
    });

    logger.info(`[SavedRoutes] Memo ${memoId} saved to list "${listName}" for user ${req.user._id}`);
    return res.status(201).json({ success: true, alreadySaved: false, savedMemo });
  })
);

// ── GET /api/saved ────────────────────────────────────────────────────────────
router.get(
  "/",
  asyncWrapper(async (req, res) => {
    const savedDocs = await SavedMemo.find({ userId: req.user._id })
      .sort({ savedAt: -1 })
      .populate({
        path:   "memoId",
        select: "companyName websiteUrl status createdAt memo vcMatches",
      });

    // Group by listName
    const lists = {};
    for (const doc of savedDocs) {
      if (!doc.memoId) continue; // memo was deleted — skip orphaned saves
      const key = doc.listName || "Default";
      if (!lists[key]) lists[key] = [];
      lists[key].push({
        savedMemoId: doc._id,
        listName:    doc.listName,
        notes:       doc.notes,
        savedAt:     doc.savedAt,
        memo:        doc.memoId,
      });
    }

    return res.json({ lists });
  })
);

// ── DELETE /api/saved/:savedMemoId ────────────────────────────────────────────
router.delete(
  "/:savedMemoId",
  asyncWrapper(async (req, res) => {
    const doc = await SavedMemo.findOneAndDelete({
      _id:    req.params.savedMemoId,
      userId: req.user._id, // ownership check
    });

    if (!doc) {
      return res.status(404).json({ error: "Saved memo not found or not authorized." });
    }

    logger.info(`[SavedRoutes] Removed saved memo ${req.params.savedMemoId} for user ${req.user._id}`);
    return res.json({ success: true });
  })
);

export default router;
