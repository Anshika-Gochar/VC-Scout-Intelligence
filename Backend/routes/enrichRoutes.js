import express from "express";
import axios from "axios";
import Enrichment from "../models/Enrichment.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Company from "../models/Company.js";

const router = express.Router();

console.log(process.env.GEMINI_API_KEY);

// Get enrichment by company ID
router.get("/:companyId", async (req, res) => {
  try {
    const enrichment = await Enrichment.findOne({ companyId: req.params.companyId });
    if (!enrichment) {
      return res.status(404).json({ error: "Enrichment not found" });
    }
    res.json(enrichment);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch enrichment" });
  }
});

// Create or get enrichment
router.post("/", async (req, res) => {
  let { website, companyId } = req.body;
  console.log("\n🚀 New Enrichment Request");
  console.log("Company ID:", companyId);
  console.log("Website:", website);


  if (!website) {
    return res.status(400).json({ error: "Website is required" });
  }

  // Format URL correctly
  if (!website.startsWith("http")) {
    website = "https://" + website;
  }

  try {
    // Check cache first
    const cached = await Enrichment.findOne({ companyId });
    if (cached) return res.json(cached);

    let pageText = "";

    // 1. Try Firecrawl
    const firecrawlKey = process.env.FIRECRAWL_KEY || process.env.FIRECRAWL_API_KEY;
    if (firecrawlKey) {
      try {
        const scrape = await axios.post(
          "https://api.firecrawl.dev/v1/scrape",
          { url: website, formats: ["markdown"] },
          { headers: { Authorization: `Bearer ${firecrawlKey}` }, timeout: 15000 }
        );
        pageText = (scrape.data.data?.markdown || "").slice(0, 8000);
      } catch (e) {
        console.log("Firecrawl failed, trying axios fallback...");
      }
    }

    // 2. Axios Fallback
    if (!pageText) {
      try {
        const fetch = await axios.get(website, {
          timeout: 10000,
          headers: { "User-Agent": "Mozilla/5.0" }
        });
        // Simple HTML strip
        pageText = fetch.data.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 10000);
      } catch (e) {
        console.log("Axios fallback failed:", e.message);
      }
    }

    if (!pageText) return res.status(500).json({ error: "Could not fetch content from " + website });

    // 3. AI Extraction
    let extractedData = extractBasicData(pageText); // Start with basic, then overwrite with AI

    if (process.env.GEMINI_API_KEY) {
      console.log("\n🤖 Sending data to Gemini...");
      try {
        // Initialize inside the route to ensure ENV variables are loaded
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Extract info from this text. Return ONLY valid JSON.
        Structure: 
        { 
          "summary": "string", 
          "bullets": ["string"], 
          "keywords": ["string"], 
          "signals": ["string"] 
        } 
        
        Text: ${pageText}`;

        const resultAI = await model.generateContent(prompt);
        const response = await resultAI.response;
        const text = response.text();

        console.log("\n Raw AI Response:");
        console.log(text);

        // Use regex to find the JSON block even if Gemini adds extra text
        //
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aiResult = JSON.parse(jsonMatch[0]);
          extractedData = {
            summary: aiResult.summary || extractedData.summary,
            bullets: Array.isArray(aiResult.bullets) ? aiResult.bullets : extractedData.bullets,
            keywords: Array.isArray(aiResult.keywords) ? aiResult.keywords : extractedData.keywords,
            signals: Array.isArray(aiResult.signals) ? aiResult.signals : extractedData.signals
          };
        }
      } catch (e) {
        console.error("Gemini AI Logic Error:", e.message);
        // We already have extractedData from extractBasicData, so we just continue
      }
    }

    console.log("\n Final Extracted Data:");
    console.log(JSON.stringify(extractedData, null, 2));

    const saved = await Enrichment.create({
      companyId,
      ...extractedData,
      sources: [website],
      timestamp: new Date()
    });
    await Company.findByIdAndUpdate(companyId, {
      industry: extractedData.keywords?.[0] || "Technology",
      location: "Global", // Ensure your AI extracts this
      // any other fields you want to show in the main list
    });
    res.json(saved);
  } catch (err) {
    console.error("Full Route Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Basic extraction function
function extractBasicData(text) {
  const lowerText = text.toLowerCase();
  const signals = [];
  if (lowerText.includes("blog")) signals.push("Blog exists");
  if (lowerText.includes("career") || lowerText.includes("hiring")) signals.push("Hiring page");
  if (lowerText.includes("docs") || lowerText.includes("api")) signals.push("Developer Resources");
  if (lowerText.includes("pricing")) signals.push("Pricing page");

  return {
    summary: "Information extracted from " + text.slice(0, 100) + "...",
    bullets: ["Web content analyzed", "Platform discovery active"],
    keywords: ["technology", "startup"],
    signals: signals.length > 0 ? signals : ["Website live"]
  };
}

export default router;