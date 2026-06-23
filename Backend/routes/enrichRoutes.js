import express from "express";
import axios from "axios";
import Enrichment from "../models/Enrichment.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Company from "../models/Company.js";
import asyncWrapper from "../middleware/asyncWrapper.js";
import logger from "../utils/logger.js";

const router = express.Router();

// ── GET /api/enrich/:companyId — fetch cached enrichment ──────────────────
router.get(
  "/:companyId",
  asyncWrapper(async (req, res) => {
    const enrichment = await Enrichment.findOne({
      companyId: req.params.companyId,
    });
    if (!enrichment) {
      return res.status(404).json({ error: "Enrichment not found" });
    }
    res.json(enrichment);
  })
);

// ── POST /api/enrich — run scrape + AI extraction pipeline ────────────────
router.post(
  "/",
  asyncWrapper(async (req, res) => {
    let { website, companyId } = req.body;

    // ── Input validation ──────────────────────────────────────────────────
    if (!website || !website.trim()) {
      return res.status(400).json({ error: "website is required" });
    }
    if (!companyId) {
      return res.status(400).json({ error: "companyId is required" });
    }

    // Normalise URL — add https:// if missing
    website = website.trim();
    if (!website.startsWith("http")) {
      website = "https://" + website;
    }

    // Validate it's a real URL (must have at least one dot in hostname)
    let parsedUrl;
    try {
      parsedUrl = new URL(website);
    } catch (_) {
      return res.status(400).json({
        error: `"${website}" is not a valid URL. Please enter a full website URL like https://stripe.com`,
      });
    }

    const hostname = parsedUrl.hostname;
    if (!hostname.includes(".")) {
      return res.status(400).json({
        error: `"${website}" does not look like a real website. Did you mean https://${hostname}.com?`,
      });
    }

    logger.info(`Enrichment request — company: ${companyId}, site: ${website}`);

    // ── Cache check ───────────────────────────────────────────────────────
    const cached = await Enrichment.findOne({ companyId });
    if (cached) {
      logger.info(`Cache hit for companyId: ${companyId}`);
      return res.json(cached);
    }

    // ── Step 1: Firecrawl scrape ──────────────────────────────────────────
    let pageText = "";
    const firecrawlKey = process.env.FIRECRAWL_KEY || process.env.FIRECRAWL_API_KEY;

    if (firecrawlKey) {
      try {
        const scrape = await axios.post(
          "https://api.firecrawl.dev/v1/scrape",
          { url: website, formats: ["markdown"] },
          {
            headers: { Authorization: `Bearer ${firecrawlKey}` },
            timeout: 15000,
          }
        );
        pageText = (scrape.data.data?.markdown || "").slice(0, 8000);
        logger.info("Firecrawl scrape succeeded");
      } catch (e) {
        logger.warn(`Firecrawl failed (${e.message}), falling back to axios`);
      }
    }

    // ── Step 2: Axios HTML fallback ───────────────────────────────────────
    if (!pageText) {
      try {
        const response = await axios.get(website, {
          timeout: 10000,
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        // Strip HTML tags and collapse whitespace
        pageText = response.data
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .slice(0, 10000);
        logger.info("Axios HTML fallback succeeded");
      } catch (e) {
        logger.warn(`Axios fallback failed: ${e.message}`);
      }
    }

    if (!pageText) {
      return res
        .status(502)
        .json({ error: `Could not fetch any content from ${website}` });
    }

    // ── Step 3: AI extraction (with graceful fallback) ────────────────────
    let extractedData = extractBasicData(pageText);

    if (process.env.GEMINI_API_KEY) {
      logger.info("Running Gemini AI extraction...");
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Extract structured information from the following company website text.
Return ONLY valid JSON with no extra text, markdown fences, or explanation.
Required structure:
{
  "summary": "2-3 sentence description of what the company does",
  "bullets": ["key point 1", "key point 2", "key point 3"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "signals": ["signal1", "signal2"]
}

Website text:
${pageText}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        logger.debug("Raw Gemini response received");

        // Extract JSON even if Gemini wraps it in markdown fences
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aiResult = JSON.parse(jsonMatch[0]);
          extractedData = {
            summary: aiResult.summary || extractedData.summary,
            bullets: Array.isArray(aiResult.bullets)
              ? aiResult.bullets
              : extractedData.bullets,
            keywords: Array.isArray(aiResult.keywords)
              ? aiResult.keywords
              : extractedData.keywords,
            signals: Array.isArray(aiResult.signals)
              ? aiResult.signals
              : extractedData.signals,
          };
          logger.info("Gemini extraction successful");
        }
      } catch (e) {
        logger.error(`Gemini extraction failed: ${e.message} — using basic fallback`);
        // extractedData already set to basic fallback above, continue
      }
    } else {
      logger.warn("GEMINI_API_KEY not set — using basic text extraction");
    }

    // ── Step 4: Persist and return ────────────────────────────────────────
    const saved = await Enrichment.create({
      companyId,
      ...extractedData,
      sources: [website],
      timestamp: new Date(),
    });

    // Update the company record with inferred metadata
    await Company.findByIdAndUpdate(companyId, {
      industry: extractedData.keywords?.[0] || undefined,
    });

    logger.info(`Enrichment saved for companyId: ${companyId}`);
    res.json(saved);
  })
);

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Basic signal extraction from raw page text when AI is unavailable.
 */
function extractBasicData(text) {
  const lower = text.toLowerCase();
  const signals = [];

  if (lower.includes("blog")) signals.push("Blog exists");
  if (lower.includes("career") || lower.includes("hiring"))
    signals.push("Hiring page");
  if (lower.includes("docs") || lower.includes("api"))
    signals.push("Developer resources available");
  if (lower.includes("pricing")) signals.push("Pricing page");
  if (lower.includes("github")) signals.push("GitHub presence");

  return {
    summary: `Content extracted from website. ${text.slice(0, 120).trim()}...`,
    bullets: ["Web content analyzed", "AI enrichment unavailable — basic extraction used"],
    keywords: ["technology", "startup"],
    signals: signals.length > 0 ? signals : ["Website live"],
  };
}

export default router;