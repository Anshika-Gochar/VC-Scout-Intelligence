import express from "express";
import List from "../models/List.js";
import asyncWrapper from "../middleware/asyncWrapper.js";

const router = express.Router();

// ── GET /api/lists — all lists ─────────────────────────────────────────────
router.get(
  "/",
  asyncWrapper(async (_req, res) => {
    const lists = await List.find().sort({ createdAt: -1 });
    res.json(lists);
  })
);

// ── GET /api/lists/:id — single list with populated companies ──────────────
router.get(
  "/:id",
  asyncWrapper(async (req, res) => {
    const list = await List.findById(req.params.id).populate("companies");
    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }
    res.json(list);
  })
);

// ── POST /api/lists — create list ─────────────────────────────────────────
router.post(
  "/",
  asyncWrapper(async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    const list = await List.create({ name: name.trim(), companies: [] });
    res.status(201).json(list);
  })
);

// ── DELETE /api/lists/:id — delete list ───────────────────────────────────
router.delete(
  "/:id",
  asyncWrapper(async (req, res) => {
    const list = await List.findByIdAndDelete(req.params.id);
    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }
    res.json({ message: "List deleted" });
  })
);

// ── PUT /api/lists/:id/add — add company to list ───────────────────────────
router.put(
  "/:id/add",
  asyncWrapper(async (req, res) => {
    const { companyId } = req.body;
    if (!companyId) {
      return res.status(400).json({ error: "companyId is required" });
    }

    const list = await List.findById(req.params.id);
    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    if (!list.companies.map(String).includes(String(companyId))) {
      list.companies.push(companyId);
      await list.save();
    }

    res.json(list);
  })
);

// ── PUT /api/lists/:id/remove — remove company from list ──────────────────
router.put(
  "/:id/remove",
  asyncWrapper(async (req, res) => {
    const { companyId } = req.body;
    if (!companyId) {
      return res.status(400).json({ error: "companyId is required" });
    }

    const list = await List.findById(req.params.id);
    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    list.companies = list.companies.filter(
      (c) => c.toString() !== companyId
    );
    await list.save();

    res.json(list);
  })
);

export default router;
