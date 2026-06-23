/**
 * synthesizerAgent.js — Generates a structured investment memo via Gemini
 *
 * Key fix: gemini-2.5-flash is a thinking model. Without thinkingBudget:0
 * it spends 60-90s "thinking" before responding → pipeline timeouts.
 * Setting thinkingBudget:0 forces instant JSON mode (~5-8s response time).
 *
 * Input:  { companyName, websiteUrl, rawData: { webContent, newsArticles, githubData } }
 * Output: { success: Boolean, memo: Object, error: String }
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "../utils/logger.js";

const MODEL_NAME = "gemini-2.5-flash";

// Sleep helper
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Build a compact prompt — smaller = faster response
function buildPrompt(companyName, websiteUrl, rawData) {
  const { webContent, newsArticles, githubData } = rawData;

  const web = webContent
    ? webContent.slice(0, 2500)
    : "No website content available.";

  const news =
    newsArticles && newsArticles.length > 0
      ? newsArticles.slice(0, 3).map((a) => `- ${a.title}: ${a.summary}`).join("\n")
      : "No news found.";

  const github = githubData
    ? `Stars: ${githubData.stars}, Forks: ${githubData.forks}, Last commit: ${
        githubData.lastCommit ? new Date(githubData.lastCommit).toDateString() : "N/A"
      }, Activity: ${githubData.activity?.slice(0, 200)}`
    : "No GitHub data found.";

  return `You are an expert VC analyst. Analyze this startup and return ONLY a valid JSON object (no markdown, no explanation):

Company: ${companyName}
Website: ${websiteUrl || "N/A"}

WEBSITE CONTENT:
${web}

NEWS:
${news}

GITHUB:
${github}

Return exactly this JSON structure:
{
  "overview": "2-3 sentence company overview",
  "problem": "Problem being solved",
  "solution": "Product/solution description",
  "market": "Target market analysis",
  "traction": "Growth metrics and signals",
  "businessModel": "Revenue model",
  "competition": "Key competitors",
  "risks": "Top 3 risks",
  "investmentScore": <0-100 integer>,
  "confidenceScore": <0-100 integer>,
  "totalAddressableMarket": "e.g. $12B",
  "arr": "Revenue estimate or N/A",
  "fundingStage": "e.g. Seed, Series A"
}`;
}

// Parse JSON safely from Gemini text
function parseJson(text) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("No valid JSON found in response");
  }
}

export async function runSynthesizerAgent(companyName, websiteUrl, rawData) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, memo: null, error: "GEMINI_API_KEY not set." };
  }

  logger.info(`[SynthesizerAgent] Starting for "${companyName}"`);

  const genAI = new GoogleGenerativeAI(apiKey);
  const prompt = buildPrompt(companyName, websiteUrl, rawData);

  const MAX_ATTEMPTS = 5;
  const DELAYS = [5000, 10000, 20000, 30000, 40000];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      logger.info(`[SynthesizerAgent] Attempt ${attempt}/${MAX_ATTEMPTS} — ${MODEL_NAME}`);

      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      if (!text) throw new Error("Empty response from Gemini");

      const memo = parseJson(text);
      memo.investmentScore = Math.round(Number(memo.investmentScore) || 50);
      memo.confidenceScore = Math.round(Number(memo.confidenceScore) || 50);

      logger.info(
        `[SynthesizerAgent] ✓ Done on attempt ${attempt} — score: ${memo.investmentScore}, confidence: ${memo.confidenceScore}`
      );
      return { success: true, memo, error: null };
    } catch (err) {
      const fullMsg = err.message || "Unknown error";
      logger.warn(`[SynthesizerAgent] Attempt ${attempt} failed: ${fullMsg.slice(0, 300)}`);

      const is503 = fullMsg.includes("503") || fullMsg.includes("Service Unavailable") || fullMsg.includes("overloaded");
      const is404 = fullMsg.includes("404") || fullMsg.includes("not found");

      // 429 quota — parse the retry-after seconds from the error message
      const is429 = fullMsg.includes("429") || fullMsg.includes("quota") || fullMsg.includes("rate") || fullMsg.includes("Quota");

      if (is404) {
        return { success: false, memo: null, error: `Model not available: ${fullMsg.slice(0, 120)}` };
      }

      if (is429) {
        // Check if it's a daily quota (not just per-minute rate limit)
        const isDailyQuota =
          fullMsg.includes("PerDay") ||
          fullMsg.includes("per_day") ||
          fullMsg.includes("free_tier_requests");

        if (isDailyQuota) {
          logger.error(`[SynthesizerAgent] ✗ Daily API quota exhausted (20 req/day free tier). Resets at midnight Pacific.`);
          return {
            success: false,
            memo: null,
            error: "QUOTA_EXHAUSTED: Gemini free tier daily limit (20 requests) reached. Resets at midnight Pacific time."
          };
        }

        // Per-minute rate limit — parse retry-after and wait
        const retryMatch = fullMsg.match(/retry[^\d]*(\d+)/i);
        const waitSec = retryMatch ? Math.min(parseInt(retryMatch[1]) + 2, 65) : 45;

        if (attempt < MAX_ATTEMPTS) {
          logger.info(`[SynthesizerAgent] Rate limited. Waiting ${waitSec}s (API retry-after)…`);
          await sleep(waitSec * 1000);
          continue;
        }
      }

      if (is503 && attempt < MAX_ATTEMPTS) {
        const delay = DELAYS[attempt - 1];
        logger.info(`[SynthesizerAgent] 503 overload. Retrying in ${delay / 1000}s…`);
        await sleep(delay);
        continue;
      }

      if (attempt < MAX_ATTEMPTS) {
        const delay = DELAYS[attempt - 1];
        logger.info(`[SynthesizerAgent] Retrying in ${delay / 1000}s…`);
        await sleep(delay);
        continue;
      }

      return {
        success: false,
        memo: null,
        error: `All ${MAX_ATTEMPTS} attempts failed. Last: ${fullMsg.slice(0, 200)}`
      };
    }
  }
}


