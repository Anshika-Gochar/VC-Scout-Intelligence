import express from "express";
import Company from "../models/Company.js";
import asyncWrapper from "../middleware/asyncWrapper.js";

const router = express.Router();

// ── GET /api/companies — list with search, filters, pagination ──────────────
router.get(
  "/",
  asyncWrapper(async (req, res) => {
    const { search, industry, funding, location, page = 1, limit = 10 } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { industry: { $regex: search, $options: "i" } },
      ];
    }
    if (industry && industry !== "All") query.industry = industry;
    if (funding && funding !== "All") query.funding = funding;
    if (location && location !== "All") query.location = location;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [companies, total] = await Promise.all([
      Company.find(query).skip(skip).limit(parseInt(limit)),
      Company.countDocuments(query),
    ]);

    res.json({ companies, total });
  })
);

// ── GET /api/companies/:id — single company ────────────────────────────────
router.get(
  "/:id",
  asyncWrapper(async (req, res) => {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    res.json(company);
  })
);

// ── POST /api/companies — create company ───────────────────────────────────
router.post(
  "/",
  asyncWrapper(async (req, res) => {
    const { name, website } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    if (!website || !website.trim()) {
      return res.status(400).json({ error: "website is required" });
    }

    // Return existing company instead of creating a duplicate
    if (website) {
      const existing = await Company.findOne({ website });
      if (existing) {
        return res.status(200).json(existing);
      }
    }

    const company = await Company.create(req.body);
    res.status(201).json(company);
  })
);

// ── PUT /api/companies/:id — update company ────────────────────────────────
router.put(
  "/:id",
  asyncWrapper(async (req, res) => {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    res.json(company);
  })
);

// ── DELETE /api/companies/:id — delete company ─────────────────────────────
router.delete(
  "/:id",
  asyncWrapper(async (req, res) => {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    res.json({ message: "Company deleted" });
  })
);

export default router;
