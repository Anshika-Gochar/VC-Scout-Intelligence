/**
 * vcMatchingService.js — Gemini-powered VC firm matching
 *
 * Accepts a startup's memo object and returns the top 5 best-fit VC firms.
 * Uses Gemini to reason about fit based on stage, market, business model, traction.
 *
 * TODO: replace with ChromaDB semantic matching in v2 for real-time vector search
 *       against a VC database with embeddings per firm's thesis/portfolio.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "../utils/logger.js";

const MODEL_NAME = "gemini-2.5-flash";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Sanitize any array values returned by Gemini to strings */
const sanitize = (v) => (Array.isArray(v) ? v.join(", ") : (v ?? ""));

/** Fallback VCs returned when Gemini fails or quota is exceeded */
const FALLBACK_VCS = [
  {
    name: "Sequoia Capital",
    focus: "Software & AI",
    matchScore: 72,
    thesis: "Backs ambitious founders building category-defining software companies.",
    recentInvestments: ["Stripe", "OpenAI", "Linear"],
    stage: "Series A",
    reason: "Sequoia has a broad mandate across software verticals and strong track record at Series A stage."
  },
  {
    name: "Andreessen Horowitz",
    focus: "Enterprise Tech",
    matchScore: 70,
    thesis: "Invests in software eating the world — from infrastructure to consumer.",
    recentInvestments: ["Figma", "GitHub", "Notion"],
    stage: "Series A",
    reason: "a16z's broad portfolio and operational support make them a strong fit for growth-stage software."
  },
  {
    name: "Accel Partners",
    focus: "B2B SaaS",
    matchScore: 68,
    thesis: "Focused on early-stage B2B and developer-led growth companies globally.",
    recentInvestments: ["Atlassian", "Dropbox", "Slack"],
    stage: "Seed / Series A",
    reason: "Accel specialises in developer tools and B2B SaaS with strong global reach."
  },
];

/**
 * Build a compact profile string from the memo data
 */
function buildProfile(companyName, memo) {
  return [
    `${companyName}.`,
    memo.overview   ? `Overview: ${memo.overview.slice(0, 200)}.` : "",
    memo.market     ? `Market: ${memo.market.slice(0, 150)}.` : "",
    memo.fundingStage ? `Stage: ${memo.fundingStage}.` : "",
    memo.traction   ? `Traction: ${memo.traction.slice(0, 150)}.` : "",
    memo.businessModel ? `Business Model: ${memo.businessModel.slice(0, 120)}.` : "",
    memo.investmentScore ? `AI Investment Score: ${memo.investmentScore}/100.` : "",
  ].filter(Boolean).join(" ");
}

/**
 * Parse and sanitize the VC array returned by Gemini
 */
function parseVCs(text) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let arr;
  try {
    arr = JSON.parse(cleaned);
  } catch (_) {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("No JSON array found in Gemini response");
    arr = JSON.parse(match[0]);
  }

  if (!Array.isArray(arr)) throw new Error("Parsed result is not an array");

  return arr.slice(0, 5).map((vc) => ({
    name:              sanitize(vc.name)   || "Unknown VC",
    focus:             sanitize(vc.focus)  || "Technology",
    matchScore:        Math.round(Number(vc.matchScore) || 70),
    thesis:            sanitize(vc.thesis) || "",
    recentInvestments: Array.isArray(vc.recentInvestments)
      ? vc.recentInvestments.slice(0, 3).map(String)
      : [],
    stage:             sanitize(vc.stage)  || "Series A",
    reason:            sanitize(vc.reason) || "",
  }));
}

/**
 * Main export — returns array of 5 VC matches
 * @param {string} companyName
 * @param {object} memo  — the memo sub-document from MongoDB
 * @returns {Promise<Array>}
 */
export async function runVcMatching(companyName, memo) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn("[VcMatching] No GEMINI_API_KEY — returning fallback VCs.");
    return FALLBACK_VCS;
  }

  const profile = buildProfile(companyName, memo);
  logger.info(`[VcMatching] Matching VCs for "${companyName}"`);

  const prompt = `Startup profile: ${profile}

Return a JSON array of exactly 5 best-fit VC firms that would likely invest in this startup.
Return ONLY valid JSON, no markdown, no explanation.

[
  {
    "name": "real VC firm name",
    "focus": "2-3 word focus area e.g. AI Infrastructure",
    "matchScore": 60-99,
    "thesis": "one sentence investment thesis",
    "recentInvestments": ["company1", "company2", "company3"],
    "stage": "e.g. Seed, Series A, Growth",
    "reason": "why this VC fits this startup in 2 sentences"
  }
]
Sort by matchScore descending. Use only real, well-known VC firm names.`;

  const MAX_ATTEMPTS = 3;
  const DELAYS = [8000, 15000, 25000];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      logger.info(`[VcMatching] Attempt ${attempt}/${MAX_ATTEMPTS}`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      const vcs = parseVCs(text);
      logger.info(`[VcMatching] ✓ Got ${vcs.length} VC matches for "${companyName}"`);
      return vcs;

    } catch (err) {
      const msg = err.message || "";
      logger.warn(`[VcMatching] Attempt ${attempt} failed: ${msg.slice(0, 200)}`);

      // Daily quota exhausted — don't retry, just fallback
      const isDailyQuota = msg.includes("PerDay") || msg.includes("free_tier_requests");
      if (isDailyQuota) {
        logger.warn("[VcMatching] Daily quota exhausted — returning fallback VCs.");
        return FALLBACK_VCS;
      }

      if (attempt < MAX_ATTEMPTS) {
        const delay = DELAYS[attempt - 1];
        logger.info(`[VcMatching] Retrying in ${delay / 1000}s…`);
        await sleep(delay);
        continue;
      }

      logger.warn("[VcMatching] All attempts failed — returning fallback VCs.");
      return FALLBACK_VCS;
    }
  }

  return FALLBACK_VCS;
}
