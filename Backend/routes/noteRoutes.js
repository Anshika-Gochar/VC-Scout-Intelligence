import express from "express";
import Note from "../models/Note.js";

const router = express.Router();

// Get all notes for a company
router.get("/:companyId", async (req, res) => {
  try {
    const notes = await Note.find({ companyId: req.params.companyId }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// Create note
router.post("/", async (req, res) => {
  try {
    const { companyId, content } = req.body;
    const note = await Note.create({ companyId, content });
    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ error: "Failed to create note" });
  }
});

// Delete note
router.delete("/:id", async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: "Note deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete note" });
  }
});

export default router;
