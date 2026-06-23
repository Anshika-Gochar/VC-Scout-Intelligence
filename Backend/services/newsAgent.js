/**
 * newsAgent.js — Fetches startup news via DuckDuckGo Instant Answer API
 * Returns: { success: Boolean, articles: [{title, url, summary}], error: String }
 *
 * ⚠ Rate limits: DDG Instant Answers has no official rate limit but can block
 *   burst traffic. We add a small retry with delay if needed.
 * ⚠ DDG Instant Answer API is best-effort — obscure startups may return 0 results.
 *   The orchestrator will continue with whatever data is available.
 */

import axios from "axios";
import logger from "../utils/logger.js";

const DDG_API = "https://api.duckduckgo.com/";

export async function runNewsAgent(companyName) {
  if (!companyName) {
    return { success: false, articles: [], error: "No company name provided." };
  }

  const query = `${companyName} startup funding news 2024`;
  logger.info(`[NewsAgent] Searching → "${query}"`);

  try {
    const response = await axios.get(DDG_API, {
      params: {
        q: query,
        format: "json",
        no_html: 1,
        no_redirect: 1,
        skip_disambig: 1,
      },
      timeout: 15_000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; VCScout/1.0; research-bot)",
      },
    });

    const data = response.data;

    const articles = [];

    // 1. RelatedTopics — the richest source
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics) {
        if (articles.length >= 5) break;
        if (topic.Text && topic.FirstURL) {
          articles.push({
            title:   topic.Text.split(" - ")[0].slice(0, 120),
            url:     topic.FirstURL,
            summary: topic.Text.slice(0, 300),
          });
        }
        // Nested Topics array (DDG topic groups)
        if (topic.Topics && Array.isArray(topic.Topics)) {
          for (const sub of topic.Topics) {
            if (articles.length >= 5) break;
            if (sub.Text && sub.FirstURL) {
              articles.push({
                title:   sub.Text.split(" - ")[0].slice(0, 120),
                url:     sub.FirstURL,
                summary: sub.Text.slice(0, 300),
              });
            }
          }
        }
      }
    }

    // 2. Results array (less common but present sometimes)
    if (data.Results && Array.isArray(data.Results)) {
      for (const r of data.Results) {
        if (articles.length >= 5) break;
        if (r.Text && r.FirstURL) {
          articles.push({
            title:   r.Text.split(" - ")[0].slice(0, 120),
            url:     r.FirstURL,
            summary: r.Text.slice(0, 300),
          });
        }
      }
    }

    // 3. Abstract (single result for well-known entities)
    if (articles.length === 0 && data.Abstract && data.AbstractURL) {
      articles.push({
        title:   data.Heading || companyName,
        url:     data.AbstractURL,
        summary: data.Abstract.slice(0, 300),
      });
    }

    if (articles.length === 0) {
      logger.warn(`[NewsAgent] No articles found for "${companyName}" — DDG returned empty results.`);
      return {
        success: false,
        articles: [],
        error: `No news found for "${companyName}". This is common for stealth/lesser-known startups.`,
      };
    }

    logger.info(`[NewsAgent] ✓ Found ${articles.length} articles for "${companyName}"`);
    return { success: true, articles, error: null };
  } catch (err) {
    const msg = err.message || "DuckDuckGo request failed";
    logger.error(`[NewsAgent] ✗ ${msg}`);
    return { success: false, articles: [], error: msg };
  }
}
