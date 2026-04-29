import express from "express";
import Company from "../models/Company.js";

const router = express.Router();

// Get all companies with search and filters
router.get("/", async (req, res) => {
  try {
    const { search, industry, funding, location, page = 1, limit = 10 } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { industry: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (industry && industry !== "All") {
      query.industry = industry;
    }
    
    if (funding && funding !== "All") {
      query.funding = funding;
    }
    
    if (location && location !== "All") {
      query.location = location;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [companies, total] = await Promise.all([
      Company.find(query).skip(skip).limit(parseInt(limit)),
      Company.countDocuments(query)
    ]);
    
    res.json({ companies, total });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

// Get single company
router.get("/:id", async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch company" });
  }
});

// Create company
router.post("/", async (req, res) => {
  try {

    const existing = await Company.findOne({ website: req.body.website });
    if (existing) {
      return res.status(200).json(existing); // Return existing instead of error
    }
    const company = await Company.create(req.body);
    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ error: "Failed to create company" });
  }
});

// Update company
router.put("/:id", async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: "Failed to update company" });
  }
});

// Delete company
router.delete("/:id", async (req, res) => {
  try {
    await Company.findByIdAndDelete(req.params.id);
    res.json({ message: "Company deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete company" });
  }
});

export default router;
