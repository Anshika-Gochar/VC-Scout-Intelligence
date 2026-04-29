import express from "express";
import List from "../models/List.js";

const router = express.Router();

// Get all lists
router.get("/", async (req, res) => {
  try {
    const lists = await List.find().sort({ createdAt: -1 });
    res.json(lists);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch lists" });
  }
});

// Get single list with companies
router.get("/:id", async (req, res) => {
  try {
    const list = await List.findById(req.params.id).populate("companies");
    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch list" });
  }
});

// Create new list
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    const list = await List.create({ name, companies: [] });
    res.status(201).json(list);
  } catch (error) {
    res.status(500).json({ error: "Failed to create list" });
  }
});

// Delete list
router.delete("/:id", async (req, res) => {
  try {
    await List.findByIdAndDelete(req.params.id);
    res.json({ message: "List deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete list" });
  }
});

// Add company to list
router.put("/:id/add", async (req, res) => {
  try {
    const { companyId } = req.body;
    const list = await List.findById(req.params.id);
    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }
    if (!list.companies.includes(companyId)) {
      list.companies.push(companyId);
      await list.save();
    }
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Failed to add company to list" });
  }
});

// Remove company from list
router.put("/:id/remove", async (req, res) => {
  try {
    const { companyId } = req.body;
    const list = await List.findById(req.params.id);
    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }
    list.companies = list.companies.filter(
      c => c.toString() !== companyId
    );
    await list.save();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Failed to remove company from list" });
  }
});

export default router;
