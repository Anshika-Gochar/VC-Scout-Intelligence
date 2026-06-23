/**
 * researchOrchestrator.js — Drives the full 4-agent agentic research pipeline
 *
 * Flow:
 *  1. Set overall status → 'running'
 *  2. Run webAgent + newsAgent + githubAgent IN PARALLEL (Promise.allSettled)
 *  3. Update agentStatus fields in MongoDB after each resolves
 *  4. Feed all rawData to synthesizerAgent
 *  5. Persist final memo + set status → 'complete' (or 'failed' if synth fails)
 *
 * Never throws — all errors are caught, logged, and reflected in Memo state.
 */

import Memo from "../models/Memo.js";
import { runWebAgent }          from "./webAgent.js";
import { runNewsAgent }         from "./newsAgent.js";
import { runGitHubAgent }       from "./githubAgent.js";
import { runSynthesizerAgent }  from "./synthesizerAgent.js";
import { runVcMatching }        from "./vcMatchingService.js";
import logger from "../utils/logger.js";

/**
 * Helper — set a single agent's status in MongoDB
 */
async function updateAgentStatus(memoId, agentKey, status, extra = {}) {
  const update = {
    [`agentStatus.${agentKey}.status`]: status,
  };
  if (status === "done" || status === "failed") {
    update[`agentStatus.${agentKey}.completedAt`] = new Date();
  }
  Object.assign(update, extra);
  await Memo.findByIdAndUpdate(memoId, { $set: update });
}

/**
 * Main orchestrator — called asynchronously (fire-and-forget) from the route.
 */
export async function orchestrateResearch({ memoId, companyName, websiteUrl }) {
  logger.info(`[Orchestrator] ▶ Starting pipeline for memo ${memoId} — "${companyName}"`);

  try {
    // ── Mark pipeline as running ──────────────────────────────────────────
    await Memo.findByIdAndUpdate(memoId, {
      $set: {
        status: "running",
        "agentStatus.webAgent.status":         "running",
        "agentStatus.newsAgent.status":        "running",
        "agentStatus.githubAgent.status":      "running",
        "agentStatus.synthesizerAgent.status": "idle",
      },
    });

    // ── Run the 3 data-collection agents in parallel ──────────────────────
    logger.info(`[Orchestrator] Launching web + news + github agents in parallel…`);

    const [webResult, newsResult, githubResult] = await Promise.allSettled([
      runWebAgent(websiteUrl),
      runNewsAgent(companyName),
      runGitHubAgent(companyName),
    ]);

    // ── Process web agent result ──────────────────────────────────────────
    let webContent = "";
    if (webResult.status === "fulfilled" && webResult.value.success) {
      webContent = webResult.value.content;
      await updateAgentStatus(memoId, "webAgent", "done", {
        "rawData.webContent": webContent,
      });
      logger.info(`[Orchestrator] ✓ WebAgent done`);
    } else {
      const err = webResult.status === "rejected"
        ? webResult.reason?.message
        : webResult.value?.error;
      await updateAgentStatus(memoId, "webAgent", "failed");
      logger.warn(`[Orchestrator] ✗ WebAgent failed: ${err}`);
    }

    // ── Process news agent result ─────────────────────────────────────────
    let newsArticles = [];
    if (newsResult.status === "fulfilled" && newsResult.value.success) {
      newsArticles = newsResult.value.articles;
      await updateAgentStatus(memoId, "newsAgent", "done", {
        "rawData.newsArticles": newsArticles,
      });
      logger.info(`[Orchestrator] ✓ NewsAgent done — ${newsArticles.length} articles`);
    } else {
      const err = newsResult.status === "rejected"
        ? newsResult.reason?.message
        : newsResult.value?.error;
      await updateAgentStatus(memoId, "newsAgent", "failed");
      logger.warn(`[Orchestrator] ✗ NewsAgent failed: ${err}`);
    }

    // ── Process GitHub agent result ───────────────────────────────────────
    let githubData = null;
    if (githubResult.status === "fulfilled" && githubResult.value.success) {
      githubData = githubResult.value.data;
      await updateAgentStatus(memoId, "githubAgent", "done", {
        "rawData.githubData": githubData,
      });
      logger.info(`[Orchestrator] ✓ GitHubAgent done — ⭐ ${githubData.stars}`);
    } else {
      const err = githubResult.status === "rejected"
        ? githubResult.reason?.message
        : githubResult.value?.error;
      await updateAgentStatus(memoId, "githubAgent", "failed");
      logger.warn(`[Orchestrator] ✗ GitHubAgent failed: ${err}`);
    }

    // ── Run Synthesizer ───────────────────────────────────────────────────
    await updateAgentStatus(memoId, "synthesizerAgent", "running");

    const rawData = { webContent, newsArticles, githubData };
    const synthResult = await runSynthesizerAgent(companyName, websiteUrl, rawData);

    if (synthResult.success) {
      // ── Sanitize memo: Gemini sometimes returns arrays for string fields ──
      const raw = synthResult.memo;
      const sanitize = (v) => Array.isArray(v) ? v.join(" | ") : (v ?? "");
      const cleanMemo = {
        overview:               sanitize(raw.overview),
        problem:                sanitize(raw.problem),
        solution:               sanitize(raw.solution),
        market:                 sanitize(raw.market),
        traction:               sanitize(raw.traction),
        businessModel:          sanitize(raw.businessModel),
        competition:            sanitize(raw.competition),
        risks:                  sanitize(raw.risks),
        investmentScore:        raw.investmentScore,
        confidenceScore:        raw.confidenceScore,
        totalAddressableMarket: sanitize(raw.totalAddressableMarket),
        arr:                    sanitize(raw.arr),
        fundingStage:           sanitize(raw.fundingStage),
      };

      await Memo.findByIdAndUpdate(memoId, {
        $set: {
          status:                                    "complete",
          memo:                                      cleanMemo,
          "agentStatus.synthesizerAgent.status":      "done",
          "agentStatus.synthesizerAgent.completedAt": new Date(),
        },
      });
      logger.info(`[Orchestrator] ✅ Memo saved for "${companyName}".`);

      // ── VC Matching — runs after synthesizer, saves vcMatches ──────────
      await updateAgentStatus(memoId, "vcMatchingAgent", "running");
      try {
        const vcMatches = await runVcMatching(companyName, cleanMemo);
        await Memo.findByIdAndUpdate(memoId, {
          $set: {
            vcMatches,
            "agentStatus.vcMatchingAgent.status":      "done",
            "agentStatus.vcMatchingAgent.completedAt": new Date(),
          },
        });
        logger.info(`[Orchestrator] ✅ VC matching complete — ${vcMatches.length} firms found for "${companyName}".`);
      } catch (vcErr) {
        await updateAgentStatus(memoId, "vcMatchingAgent", "failed");
        logger.warn(`[Orchestrator] ✗ VC matching failed (non-fatal): ${vcErr.message}`);
      }

      logger.info(`[Orchestrator] ✅ Full pipeline complete for "${companyName}"`);
    } else {
      await Memo.findByIdAndUpdate(memoId, {
        $set: {
          status:                              "failed",
          "agentStatus.synthesizerAgent.status":      "failed",
          "agentStatus.synthesizerAgent.completedAt": new Date(),
        },
      });
      logger.error(`[Orchestrator] ✗ Synthesizer failed: ${synthResult.error}`);
    }
  } catch (fatalErr) {
    logger.error(`[Orchestrator] ⚡ Fatal error for memo ${memoId}:`, fatalErr.message);
    try {
      await Memo.findByIdAndUpdate(memoId, { $set: { status: "failed" } });
    } catch (_) {
      // Ignore secondary DB error
    }
  }
}
