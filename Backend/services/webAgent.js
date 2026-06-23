/**
 * webAgent.js — Scrapes the startup's website using Firecrawl API
 * Returns: { success: Boolean, content: String, error: String }
 *
 * Rate limits: Firecrawl free tier ~100 pages/month, no per-second cap documented.
 * Edge cases: private/gated sites will return partial or no content — handled gracefully.
 */

import axios from "axios";
import logger from "../utils/logger.js";

const FIRECRAWL_API = "https://api.firecrawl.dev/v1/scrape";

export async function runWebAgent(websiteUrl) {
  if (!websiteUrl) {
    logger.warn("[WebAgent] No websiteUrl provided — skipping.");
    return { success: false, content: "", error: "No website URL provided." };
  }

  const key = process.env.FIRECRAWL_KEY;
  if (!key) {
    return { success: false, content: "", error: "FIRECRAWL_KEY not set in environment." };
  }

  try {
    logger.info(`[WebAgent] Scraping → ${websiteUrl}`);

    const response = await axios.post(
      FIRECRAWL_API,
      {
        url: websiteUrl,
        formats: ["markdown"],
        onlyMainContent: true,
      },
      {
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        timeout: 30_000,
      }
    );

    const markdown = response.data?.data?.markdown || response.data?.markdown || "";

    if (!markdown) {
      logger.warn("[WebAgent] Firecrawl returned empty content.");
      return { success: false, content: "", error: "Firecrawl returned empty content." };
    }

    // Truncate to ~6 000 chars so we don't blow Gemini context
    const content = markdown.slice(0, 6000);

    logger.info(`[WebAgent] ✓ Scraped ${content.length} chars from ${websiteUrl}`);
    return { success: true, content, error: null };
  } catch (err) {
    const msg = err.response?.data?.error || err.message || "Unknown Firecrawl error";
    logger.error(`[WebAgent] ✗ ${msg}`);
    return { success: false, content: "", error: msg };
  }
}
