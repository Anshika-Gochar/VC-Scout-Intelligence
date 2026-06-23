import axios from "axios";

/**
 * api.js — Central Axios instance for VC Scout
 * Base URL: http://localhost:5000/api
 *
 * Includes:
 * - 15s timeout
 * - Request logging in development
 * - Response interceptor to normalize error messages
 */

export const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request interceptor — attach token & dev logging ────────────────────────
API.interceptors.request.use(
  (config) => {
    const userStr = localStorage.getItem("vc_user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      } catch (e) {
        // Silent error
      }
    }
    if (import.meta.env.DEV) {
      console.debug(`[API] → ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — normalize error messages ────────────────────────
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("vc_user");
      window.location.href = "/login?expired=true";
      return Promise.reject(error);
    }
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred";

    // Attach a clean message for components to read
    error.userMessage = message;

    if (import.meta.env.DEV) {
      console.error(
        `[API] ✗ ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${
          error.response?.status
        } ${message}`
      );
    }

    return Promise.reject(error);
  }
);

// ── Research / Agentic Pipeline ────────────────────────────────────────────

/**
 * POST /api/research/start
 * Kicks off the agentic research pipeline for a startup.
 * @returns {{ memoId: string, status: string }}
 */
export const startResearch = (companyName, websiteUrl) =>
  API.post("/research/start", { companyName, websiteUrl });

/**
 * GET /api/research/status/:memoId
 * Poll this every 3 seconds to get per-agent pipeline status.
 */
export const getResearchStatus = (memoId) =>
  API.get(`/research/status/${memoId}`);

/**
 * GET /api/research/memos
 * Returns all memos for the authenticated user, sorted by createdAt desc.
 */
export const getMemos = () => API.get("/research/memos");

/**
 * GET /api/research/memos/:memoId
 * Returns the full memo document (including rawData + memo fields).
 */
export const getMemo = (memoId) => API.get(`/research/memos/${memoId}`);

/**
 * DELETE /api/research/memos/:memoId
 * Deletes a memo (must belong to current user).
 */
export const deleteMemo = (memoId) => API.delete(`/research/memos/${memoId}`);

/**
 * GET /api/research/memos/:memoId/export-pdf
 * Streams a PDF — returns as blob for browser download trigger.
 */
export const exportMemoPDF = (memoId) =>
  API.get(`/research/memos/${memoId}/export-pdf`, { responseType: "blob" });

// ── Signals ────────────────────────────────────────────────────────────────

/**
 * GET /api/signals?type={type}
 * Returns cached or fresh market intelligence signals.
 * @param {string} [type] — optional filter: talent|code|web|funding|compliance|news
 */
export const getSignals = (type) =>
  API.get("/signals", { params: type ? { type } : {} });

/**
 * POST /api/signals/refresh
 * Force-regenerates signals (auth required). Returns fresh set.
 */
export const refreshSignals = () => API.post("/signals/refresh");

// ── Saved Memos ────────────────────────────────────────────────────────────

/**
 * GET /api/saved
 * Returns all saved memos for the current user grouped by listName.
 */
export const getSaved = () => API.get("/saved");

/**
 * POST /api/saved
 * Saves a memo to a named list. Returns { alreadySaved } if duplicate.
 */
export const saveMemo = (memoId, listName = "Default", notes = "") =>
  API.post("/saved", { memoId, listName, notes });

/**
 * DELETE /api/saved/:savedMemoId
 * Removes a saved memo bookmark.
 */
export const deleteSaved = (savedMemoId) => API.delete(`/saved/${savedMemoId}`);

/**
 * GET /api/saved/lists
 * Returns distinct listNames for the current user.
 */
export const getSavedLists = () => API.get("/saved/lists");

// ── Settings ───────────────────────────────────────────────────────────────

/**
 * GET /api/settings/status
 * Returns { gemini: { configured }, firecrawl: { configured } }.
 * NEVER returns actual key values.
 */
export const getSettingsStatus = () => API.get("/settings/status");
