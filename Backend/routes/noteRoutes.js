import express from "express";
import Note from "../models/Note.js";
import asyncWrapper from "../middleware/asyncWrapper.js";

const router = express.Router();

// ── GET /api/notes/:companyId — all notes for a company ───────────────────
router.get(
  "/:companyId",
  asyncWrapper(async (req, res) => {
    const notes = await Note.find({ companyId: req.params.companyId }).sort({
      createdAt: -1,
    });
    res.json(notes);
  })
);

// ── POST /api/notes — create note ─────────────────────────────────────────
router.post(
  "/",
  asyncWrapper(async (req, res) => {
    const { companyId, content } = req.body;

    if (!companyId || !content || !content.trim()) {
      return res
        .status(400)
        .json({ error: "companyId and content are required" });
    }

    const note = await Note.create({ companyId, content: content.trim() });
    res.status(201).json(note);
  })
);

// ── DELETE /api/notes/:id — delete note ───────────────────────────────────
router.delete(
  "/:id",
  asyncWrapper(async (req, res) => {
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }
    res.json({ message: "Note deleted" });
  })
);

export default router;
