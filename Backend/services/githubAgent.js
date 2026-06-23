/**
 * githubAgent.js — Finds and fetches public GitHub repo data for a startup
 *
 * Flow:
 *  1. DuckDuckGo Instant Answer search: "{companyName} github"
 *  2. Extract first github.com/{owner}/{repo} URL from results
 *  3. GitHub public REST API: GET /repos/{owner}/{repo}
 *  4. GET /repos/{owner}/{repo}/commits?per_page=5 for activity summary
 *
 * ⚠ Rate limits: GitHub unauthenticated = 60 req/hr per IP.
 *   With 3 requests per analysis run, this caps at ~20 analyses/hr.
 * ⚠ Many startups don't have a public GitHub repo — agent will return
 *   success:false and the orchestrator continues with partial data.
 */

import axios from "axios";
import logger from "../utils/logger.js";

const DDG_API    = "https://api.duckduckgo.com/";
const GITHUB_API = "https://api.github.com";
const GITHUB_URL_RE = /https?:\/\/github\.com\/([^/\s"]+)\/([^/\s"?#]+)/i;

// Extract owner/repo from a GitHub URL string
function parseGitHubUrl(url = "") {
  const m = url.match(GITHUB_URL_RE);
  if (!m) return null;
  const repo = m[2].replace(/\.git$/, "");
  // Skip profile-only URLs (no repo segment)
  if (!repo || repo === "") return null;
  return { owner: m[1], repo };
}

// DuckDuckGo search → first GitHub repo URL
async function findGitHubUrl(companyName) {
  const query = `${companyName} github`;
  logger.info(`[GitHubAgent] DDG search → "${query}"`);

  const res = await axios.get(DDG_API, {
    params: { q: query, format: "json", no_html: 1, no_redirect: 1, skip_disambig: 1 },
    timeout: 12_000,
    headers: { "User-Agent": "VCScout/1.0" },
  });

  const data = res.data;

  // Check AbstractURL first
  if (data.AbstractURL && GITHUB_URL_RE.test(data.AbstractURL)) {
    const parsed = parseGitHubUrl(data.AbstractURL);
    if (parsed) return parsed;
  }

  // Scan RelatedTopics
  const topics = data.RelatedTopics || [];
  for (const t of topics) {
    const urls = [t.FirstURL, t.Text];
    for (const u of urls) {
      if (!u) continue;
      const parsed = parseGitHubUrl(u);
      if (parsed) return parsed;
    }
  }

  // Scan Results
  for (const r of data.Results || []) {
    const parsed = parseGitHubUrl(r.FirstURL || "");
    if (parsed) return parsed;
  }

  return null;
}

export async function runGitHubAgent(companyName) {
  if (!companyName) {
    return { success: false, data: null, error: "No company name provided." };
  }

  try {
    // 1. Find the repo
    const found = await findGitHubUrl(companyName);
    if (!found) {
      logger.warn(`[GitHubAgent] No GitHub repo found for "${companyName}".`);
      return {
        success: false,
        data: null,
        error: `No public GitHub repo found for "${companyName}". Startup may be stealth or proprietary.`,
      };
    }

    const { owner, repo } = found;
    const repoUrl = `https://github.com/${owner}/${repo}`;
    logger.info(`[GitHubAgent] Found repo → ${repoUrl}`);

    const headers = { "User-Agent": "VCScout/1.0", Accept: "application/vnd.github+json" };

    // 2. Fetch repo metadata
    const [repoRes, commitsRes] = await Promise.allSettled([
      axios.get(`${GITHUB_API}/repos/${owner}/${repo}`, { headers, timeout: 10_000 }),
      axios.get(`${GITHUB_API}/repos/${owner}/${repo}/commits`, {
        headers,
        params: { per_page: 5 },
        timeout: 10_000,
      }),
    ]);

    if (repoRes.status === "rejected") {
      throw new Error(repoRes.reason?.message || "GitHub API error for repo metadata");
    }

    const repoData = repoRes.value.data;

    // 3. Build activity summary from commits
    let activity = "No recent commit data available.";
    if (commitsRes.status === "fulfilled") {
      const commits = commitsRes.value.data;
      if (Array.isArray(commits) && commits.length > 0) {
        const messages = commits
          .slice(0, 5)
          .map((c) => c.commit?.message?.split("\n")[0] || "")
          .filter(Boolean)
          .join(" | ");
        activity = `Last ${commits.length} commits: ${messages}`;
      }
    }

    const lastCommit = repoData.pushed_at ? new Date(repoData.pushed_at) : null;

    const result = {
      stars:      repoData.stargazers_count ?? 0,
      forks:      repoData.forks_count ?? 0,
      lastCommit,
      repoUrl,
      activity:   activity.slice(0, 500),
    };

    logger.info(`[GitHubAgent] ✓ ${owner}/${repo} — ⭐ ${result.stars}, 🍴 ${result.forks}`);
    return { success: true, data: result, error: null };
  } catch (err) {
    const msg = err.response?.data?.message || err.message || "GitHub agent error";
    logger.error(`[GitHubAgent] ✗ ${msg}`);
    return { success: false, data: null, error: msg };
  }
}
