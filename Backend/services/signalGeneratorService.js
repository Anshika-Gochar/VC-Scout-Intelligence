/**
 * signalGeneratorService.js — Gemini-powered market signal generation
 *
 * Generates 12 diverse VC market intelligence signals across 6 categories.
 * Results are cached in MongoDB for 24 hours. On quota exhaustion, returns
 * a set of high-quality hardcoded fallback signals so the page is never empty.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import Signal                 from "../models/Signal.js";
import logger                 from "../utils/logger.js";

const MODEL_NAME   = "gemini-2.5-flash";
const CACHE_HOURS  = 24;
const sleep        = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Hardcoded fallback signals (shown on quota exhaustion) ────────────────────
const FALLBACK_SIGNALS = [
  {
    type: "talent", companyName: "NeuralFlow AI", category: "TALENT",
    headline: "Senior ML Engineers Surge +12 Roles",
    description: "NeuralFlow AI opened 12 senior ML engineering positions in 48 hours, focusing on low-latency inference at scale. Hiring velocity matches pre-Series A patterns seen in top AI breakouts.",
    metricLabel: "Open Roles", metricValue: "+12 Roles", confidenceScore: 94, timeAgo: "JUST NOW",
  },
  {
    type: "talent", companyName: "Horizon Labs", category: "TALENT",
    headline: "GTM Team Doubles Ahead of Launch",
    description: "Horizon Labs doubled its go-to-market team in Q2, adding 8 sales and 4 marketing roles in 30 days. Signal strength indicates an imminent product launch or funding round.",
    metricLabel: "New Hires", metricValue: "+12 GTM", confidenceScore: 87, timeAgo: "3H AGO",
  },
  {
    type: "code", companyName: "DataMinds", category: "CODE",
    headline: "GitHub Velocity Jumps 450% Post v3",
    description: "DataMinds saw commit frequency surge 450% following their v3 release this week. Star trajectory places them in the top 5% of early-stage developer-tools projects globally.",
    metricLabel: "Commit Spike", metricValue: "450%↑", confidenceScore: 89, timeAgo: "2H AGO",
  },
  {
    type: "code", companyName: "Axiom Protocol", category: "CODE",
    headline: "Open-Source Repo Hits 3.2K Stars",
    description: "Axiom Protocol's core library crossed 3,200 GitHub stars in 14 days, organic growth with zero paid promotion. Community PR velocity tripled — strong OSS adoption signal.",
    metricLabel: "GitHub Stars", metricValue: "3,200★", confidenceScore: 91, timeAgo: "5H AGO",
  },
  {
    type: "web", companyName: "PayStack Pro", category: "WEB",
    headline: "Domain Authority Spikes 32% SEO",
    description: "PayStack Pro recorded a 32% rise in organic domain authority after landing coverage in 14 tier-1 tech publications. Referral traffic from TechCrunch alone drove 18K unique sessions.",
    metricLabel: "SEO Growth", metricValue: "+32%", confidenceScore: 91, timeAgo: "1D AGO",
  },
  {
    type: "web", companyName: "Lumos Analytics", category: "WEB",
    headline: "Traffic Up 5x — Zero Paid Ads",
    description: "Lumos Analytics grew monthly visitors from 12K to 60K in 6 weeks through a viral product-led growth loop. Bounce rate dropped to 28%, indicating strong product-market resonance.",
    metricLabel: "Traffic Growth", metricValue: "5× organic", confidenceScore: 88, timeAgo: "6H AGO",
  },
  {
    type: "funding", companyName: "CloudScale SaaS", category: "FUNDING",
    headline: "Series B Term Sheet Signed — $40M",
    description: "CloudScale SaaS closed a $40M Series B led by Accel Partners with participation from Sequoia. ARR at time of close: $8M. Valuation estimated at $160M.",
    metricLabel: "Raised", metricValue: "$40M", confidenceScore: 97, timeAgo: "1H AGO",
  },
  {
    type: "funding", companyName: "Vanta Edge", category: "FUNDING",
    headline: "Seed Extended to $6M at $40M Cap",
    description: "Vanta Edge extended its seed round to $6M after achieving $500K ARR in 9 months. The $40M post-money cap signals strong investor conviction at the earliest stage.",
    metricLabel: "Seed Round", metricValue: "$6M", confidenceScore: 85, timeAgo: "4H AGO",
  },
  {
    type: "compliance", companyName: "SecureOps Inc.", category: "COMPLIANCE",
    headline: "SOC2 Type II Certified — Enterprise Ready",
    description: "SecureOps obtained SOC2 Type II certification, unlocking enterprise procurement pipelines with Fortune 500 buyers. Sales cycle expected to shorten by 40% in target verticals.",
    metricLabel: "Certification", metricValue: "SOC2 Type II", confidenceScore: 95, timeAgo: "2D AGO",
  },
  {
    type: "compliance", companyName: "FinEdge", category: "COMPLIANCE",
    headline: "EU AI Act Compliance Filed Ahead of Peers",
    description: "FinEdge completed EU AI Act compliance documentation 8 months ahead of the regulatory deadline, creating a first-mover advantage for regulated European financial clients.",
    metricLabel: "Compliance Lead", metricValue: "8 months", confidenceScore: 82, timeAgo: "1D AGO",
  },
  {
    type: "news", companyName: "BuildFast AI", category: "NEWS",
    headline: "TechCrunch Feature Drives 20K Signups",
    description: "A TechCrunch Disrupt feature on BuildFast AI drove 20,000 new signups in 72 hours and crashed their onboarding queue. Waitlist now exceeds 45K — demand-supply mismatch signal.",
    metricLabel: "Signups", metricValue: "20K in 72h", confidenceScore: 93, timeAgo: "JUST NOW",
  },
  {
    type: "news", companyName: "Meridian Health", category: "NEWS",
    headline: "Partnership with Kaiser Permanente Announced",
    description: "Meridian Health signed a multi-year data partnership with Kaiser Permanente covering 12M patient records. Deal gives Meridian proprietary training data for its clinical AI models.",
    metricLabel: "Partnership", metricValue: "12M records", confidenceScore: 96, timeAgo: "3H AGO",
  },
];

/**
 * Parse and sanitize Gemini's signal array output
 */
function parseSignals(text) {
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
    if (!match) throw new Error("No JSON array in Gemini response");
    arr = JSON.parse(match[0]);
  }

  if (!Array.isArray(arr)) throw new Error("Parsed result is not an array");

  const validTypes = ["talent", "code", "web", "funding", "compliance", "news"];
  return arr.slice(0, 12).map((s) => ({
    type:            validTypes.includes(s.type) ? s.type : "news",
    companyName:     String(s.companyName || "Unknown Company"),
    headline:        String(s.headline    || "Market Signal Detected"),
    description:     String(s.description || ""),
    metricLabel:     String(s.metricLabel  || "Signal"),
    metricValue:     String(s.metricValue  || "—"),
    confidenceScore: Math.min(98, Math.max(75, Number(s.confidenceScore) || 80)),
    category:        String(s.category || s.type?.toUpperCase() || "SIGNAL"),
    timeAgo:         String(s.timeAgo  || "JUST NOW"),
  }));
}

/**
 * Save generated signals to MongoDB with 24-hour TTL
 */
async function persistSignals(signalData) {
  // Clear stale signals first
  await Signal.deleteMany({});

  const expiresAt = new Date(Date.now() + CACHE_HOURS * 60 * 60 * 1000);
  const generatedAt = new Date();

  const docs = signalData.map((s) => ({ ...s, isGlobal: true, generatedAt, expiresAt }));
  const saved = await Signal.insertMany(docs);
  return saved;
}

/**
 * Main export — generate 12 signals via Gemini, persist, return array.
 * Falls back to FALLBACK_SIGNALS on any error.
 */
export async function generateSignals() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn("[SignalGen] No GEMINI_API_KEY — persisting fallback signals.");
    return persistSignals(FALLBACK_SIGNALS);
  }

  const prompt = `Generate 12 diverse startup market intelligence signals across exactly these 6 categories: talent, code, web, funding, compliance, news. Use exactly 2 signals per category. Use realistic but fictional startup company names. Return ONLY valid JSON array, no markdown, no explanation.

[
  {
    "type": "talent",
    "companyName": "fictional startup name",
    "headline": "short punchy headline max 8 words",
    "description": "2 sentences with specific metrics and data points",
    "metricLabel": "e.g. Open Roles, Stars, ARR, Funding",
    "metricValue": "e.g. +12 Roles, 450%↑, $40M",
    "confidenceScore": 85,
    "category": "TALENT",
    "timeAgo": "JUST NOW"
  }
]

Rules:
- confidenceScore must be 75-98
- timeAgo options: "JUST NOW", "1H AGO", "2H AGO", "3H AGO", "6H AGO", "12H AGO", "1D AGO", "2D AGO"
- Make metricValues specific and realistic (not vague)
- company names should sound like real startups
- Return exactly 12 objects`;

  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      logger.info(`[SignalGen] Gemini attempt ${attempt}/${MAX_ATTEMPTS}`);
      const genAI  = new GoogleGenerativeAI(apiKey);
      const model  = genAI.getGenerativeModel({ model: MODEL_NAME });
      const result = await model.generateContent(prompt);
      const text   = result.response.text().trim();

      const signals = parseSignals(text);
      logger.info(`[SignalGen] ✓ Generated ${signals.length} signals from Gemini`);
      return persistSignals(signals);
    } catch (err) {
      const msg = err.message || "";
      logger.warn(`[SignalGen] Attempt ${attempt} failed: ${msg.slice(0, 120)}`);

      const isDailyQuota = msg.includes("PerDay") || msg.includes("free_tier") || msg.includes("RESOURCE_EXHAUSTED");
      if (isDailyQuota) {
        logger.warn("[SignalGen] Daily quota hit — persisting fallback signals.");
        return persistSignals(FALLBACK_SIGNALS);
      }

      if (attempt < MAX_ATTEMPTS) {
        await sleep(6000 * attempt);
        continue;
      }

      logger.warn("[SignalGen] All attempts failed — persisting fallback signals.");
      return persistSignals(FALLBACK_SIGNALS);
    }
  }

  return persistSignals(FALLBACK_SIGNALS);
}

/**
 * Check if valid (non-expired) signals exist in DB
 */
export async function getValidCachedSignals(typeFilter) {
  const query = { expiresAt: { $gt: new Date() } };
  if (typeFilter) query.type = typeFilter;
  return Signal.find(query).sort({ confidenceScore: -1 });
}

export { FALLBACK_SIGNALS };
