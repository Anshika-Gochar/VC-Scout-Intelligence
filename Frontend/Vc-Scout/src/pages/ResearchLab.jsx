/**
 * ResearchLab.jsx — Agentic Research Pipeline UI
 *
 * Flow:
 *  1. User enters company name + website URL
 *  2. POST /api/research/start → returns memoId
 *  3. Poll GET /api/research/status/:memoId every 3s
 *  4. Agent cards animate: idle → running (pulse) → done ✓ / failed ✗
 *  5. When complete → show "View Memo" button → navigate to /memos/:memoId
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Globe,
  Newspaper,
  Github,
  BrainCircuit,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  FlaskConical,
  ArrowRight,
  FileText,
  History,
  Building2,
  TrendingUp,
  Star,
} from "lucide-react";
import { startResearch, getResearchStatus, getMemos } from "../api";

// ── Agent definitions ────────────────────────────────────────────────────────
const AGENTS = [
  {
    key:         "webAgent",
    label:       "Web Agent",
    description: "Scrapes website content via Firecrawl",
    Icon:        Globe,
    color:       "from-blue-500 to-cyan-500",
    glow:        "shadow-blue-500/20",
  },
  {
    key:         "newsAgent",
    label:       "News Agent",
    description: "Searches DuckDuckGo for press & funding news",
    Icon:        Newspaper,
    color:       "from-amber-500 to-orange-500",
    glow:        "shadow-amber-500/20",
  },
  {
    key:         "githubAgent",
    label:       "GitHub Agent",
    description: "Pulls stars, forks, and commit activity",
    Icon:        Github,
    color:       "from-emerald-500 to-teal-500",
    glow:        "shadow-emerald-500/20",
  },
  {
    key:         "synthesizerAgent",
    label:       "Synthesizer",
    description: "Gemini AI generates the investment memo",
    Icon:        BrainCircuit,
    color:       "from-purple-500 to-violet-600",
    glow:        "shadow-purple-500/20",
  },
];

// ── Agent Status Badge ────────────────────────────────────────────────────────
function AgentStatusBadge({ status }) {
  if (status === "done") return (
    <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
      <CheckCircle2 className="w-3.5 h-3.5" /> Done
    </span>
  );
  if (status === "failed") return (
    <span className="flex items-center gap-1 text-red-400 text-xs font-semibold">
      <XCircle className="w-3.5 h-3.5" /> Failed
    </span>
  );
  if (status === "running") return (
    <span className="flex items-center gap-1 text-purple-400 text-xs font-semibold animate-pulse">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running
    </span>
  );
  return (
    <span className="text-zinc-500 text-xs">Idle</span>
  );
}

// ── Single Agent Card ─────────────────────────────────────────────────────────
function AgentCard({ agent, status = "idle" }) {
  const { label, description, Icon, color, glow } = agent;

  const isRunning = status === "running";
  const isDone    = status === "done";
  const isFailed  = status === "failed";

  return (
    <div
      className={`relative flex flex-col gap-3 p-5 rounded-2xl border transition-all duration-500 ${
        isRunning
          ? `border-purple-500/40 bg-purple-950/20 shadow-lg ${glow}`
          : isDone
          ? "border-emerald-500/30 bg-emerald-950/10"
          : isFailed
          ? "border-red-500/30 bg-red-950/10"
          : "border-white/5 bg-zinc-950/40"
      }`}
    >
      {/* Pulse ring when running */}
      {isRunning && (
        <span className="absolute inset-0 rounded-2xl border border-purple-500/50 animate-ping opacity-30 pointer-events-none" />
      )}

      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <AgentStatusBadge status={status} />
      </div>

      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

// ── Past Memo Card ────────────────────────────────────────────────────────────
function PastMemoCard({ memo, onClick }) {
  const score = memo?.memo?.investmentScore;
  const scoreColor =
    score >= 70 ? "text-emerald-400" : score >= 40 ? "text-amber-400" : "text-red-400";

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center justify-between p-4 bg-zinc-950/60 border border-white/5 rounded-xl hover:border-purple-500/30 transition-all group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
          {memo.companyName?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{memo.companyName}</p>
          <p className="text-xs text-zinc-500 truncate">{memo.websiteUrl || "—"}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
        {score !== undefined && (
          <span className={`text-sm font-bold ${scoreColor}`}>{score}</span>
        )}
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${
            memo.status === "complete"
              ? "border-emerald-500/30 text-emerald-400 bg-emerald-950/20"
              : memo.status === "running"
              ? "border-purple-500/30 text-purple-400 bg-purple-950/20"
              : memo.status === "failed"
              ? "border-red-500/30 text-red-400 bg-red-950/20"
              : "border-white/10 text-zinc-400"
          }`}
        >
          {memo.status}
        </span>
        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-purple-400 transition-colors" />
      </div>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ResearchLab() {
  const navigate = useNavigate();

  // Form state
  const [companyName, setCompanyName]   = useState("");
  const [websiteUrl,  setWebsiteUrl]    = useState("");

  // Pipeline state
  const [memoId,       setMemoId]       = useState(null);
  const [agentStatus,  setAgentStatus]  = useState({});
  const [overallStatus, setOverallStatus] = useState(null); // 'running'|'complete'|'failed'
  const [isRunning,    setIsRunning]    = useState(false);
  const [error,        setError]        = useState("");

  // Past memos
  const [pastMemos,   setPastMemos]     = useState([]);
  const [loadingMemos, setLoadingMemos] = useState(true);

  const pollRef = useRef(null);

  // ── Fetch past memos ────────────────────────────────────────────────────
  const fetchPastMemos = useCallback(async () => {
    try {
      const res = await getMemos();
      setPastMemos(res.data.memos || []);
    } catch (_) {
      // Silently fail — user may not have any memos yet
    } finally {
      setLoadingMemos(false);
    }
  }, []);

  const hasFetched = useRef(false);
  useEffect(() => {
    document.title = "VC Scout — Research Lab";
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchPastMemos();
  }, [fetchPastMemos]);

  // ── Polling ─────────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (id) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const res = await getResearchStatus(id);
          const data = res.data;
          setAgentStatus(data.agentStatus || {});
          setOverallStatus(data.status);

          if (data.status === "complete" || data.status === "failed") {
            stopPolling();
            setIsRunning(false);
            fetchPastMemos(); // refresh list

            if (data.status === "complete") {
              // Save to localStorage and navigate to Workspace memo view
              localStorage.setItem("lastMemoId", id);
              toast.success("✅ Research complete! Opening memo…", { duration: 3000 });
              setTimeout(() => navigate(`/workspace/${id}`), 1500);
            } else {
              toast.error("Research pipeline encountered an error.");
              setError("The pipeline failed. Some agents may have returned no data.");
            }
          }
        } catch (err) {
          stopPolling();
          setIsRunning(false);
          setError(err.userMessage || "Failed to poll research status.");
        }
      }, 3000);
    },
    [stopPolling, fetchPastMemos]
  );

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }

    setError("");
    setIsRunning(true);
    setMemoId(null);
    setAgentStatus({});
    setOverallStatus("running");

    // Optimistically set all agents to idle
    setAgentStatus({
      webAgent:         { status: "idle" },
      newsAgent:        { status: "idle" },
      githubAgent:      { status: "idle" },
      synthesizerAgent: { status: "idle" },
    });

    try {
      const res = await startResearch(companyName.trim(), websiteUrl.trim());
      const { memoId: id } = res.data;
      setMemoId(id);
      startPolling(id);
    } catch (err) {
      setIsRunning(false);
      setOverallStatus(null);
      setError(err.userMessage || "Failed to start research. Check server connection.");
    }
  };

  const handleReset = () => {
    stopPolling();
    setIsRunning(false);
    setMemoId(null);
    setAgentStatus({});
    setOverallStatus(null);
    setError("");
    setCompanyName("");
    setWebsiteUrl("");
  };

  const pipelineActive = isRunning || overallStatus === "complete" || overallStatus === "failed";
  const isComplete = overallStatus === "complete";

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-purple-400" />
            Research Lab
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Deep AI investment memo generator — 4 agents in parallel · full structured output with scores
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            <span className="text-zinc-500">vs Workspace:</span> Workspace does a quick 30s scrape. Research Lab runs a 60-90s multi-agent pipeline → full VC memo with investment score.
          </p>
        </div>
        {pipelineActive && (
          <button
            onClick={handleReset}
            className="text-xs text-zinc-400 hover:text-white border border-white/10 hover:border-purple-500/40 px-3 py-1.5 rounded-lg transition-all"
          >
            ← New Research
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-8">
        {/* ── Left Column: Form + Pipeline ─────────────────────────────── */}
        <div className="space-y-6">
          {/* Input Form */}
          {!pipelineActive && (
            <div className="glass-card p-6 bg-zinc-950/40 border border-white/5 rounded-2xl space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h2 className="text-base font-semibold text-white">Analyze a Startup</h2>
              </div>

              <form onSubmit={handleAnalyze} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Stripe, Notion, Vercel"
                      className="w-full pl-10 pr-4 py-3 bg-[#0d0c11]/80 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition-all placeholder:text-zinc-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Website URL
                    <span className="text-zinc-600 ml-1">(optional but improves quality)</span>
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full pl-10 pr-4 py-3 bg-[#0d0c11]/80 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition-all placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-400 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-900/30 hover:shadow-purple-900/50"
                >
                  <Sparkles className="w-4 h-4" />
                  Analyze Startup
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* Pipeline View */}
          {pipelineActive && (
            <div className="space-y-4">
              {/* Company banner */}
              <div className="flex items-center gap-3 p-4 bg-zinc-950/60 border border-white/5 rounded-2xl">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {companyName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-base font-bold text-white">{companyName}</p>
                  {websiteUrl && (
                    <p className="text-xs text-zinc-500 font-mono">
                      {websiteUrl.replace(/^https?:\/\//, "")}
                    </p>
                  )}
                </div>
                <div className="ml-auto">
                  {overallStatus === "running" && (
                    <span className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Researching…
                    </span>
                  )}
                  {overallStatus === "complete" && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                    </span>
                  )}
                  {overallStatus === "failed" && (
                    <span className="flex items-center gap-1.5 text-xs text-red-400 font-semibold">
                      <XCircle className="w-3.5 h-3.5" /> Failed
                    </span>
                  )}
                </div>
              </div>

              {/* Pipeline label */}
              <div className="flex items-center gap-2 px-1">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-xs text-zinc-500 font-medium">AGENT PIPELINE</span>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              {/* Agent cards grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                {AGENTS.map((agent, idx) => {
                  const aStatus = agentStatus?.[agent.key]?.status || "idle";
                  return (
                    <div key={agent.key} className="relative">
                      <AgentCard agent={agent} status={aStatus} />
                      {/* Connector arrow between cards (except last) */}
                      {idx < AGENTS.length - 1 && idx % 2 === 1 && (
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-zinc-700 z-10">
                          <ArrowRight className="w-4 h-4 rotate-90" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs text-red-400 flex items-center gap-1.5 p-3 bg-red-950/20 border border-red-500/20 rounded-xl">
                  <XCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
                </p>
              )}

              {/* CTA when complete */}
              {isComplete && memoId && (
                <button
                  onClick={() => navigate(`/memos/${memoId}`)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50"
                >
                  <FileText className="w-4 h-4" />
                  View Investment Memo
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Right Column: Past Memos ──────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
              Past Analyses
            </h2>
          </div>

          {loadingMemos ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-zinc-900/40 border border-white/5 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : pastMemos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-white/5 rounded-2xl text-center">
              <FlaskConical className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-sm text-zinc-600">No research runs yet.</p>
              <p className="text-xs text-zinc-700 mt-1">
                Analyze your first startup above.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pastMemos.map((memo) => (
                <PastMemoCard
                  key={memo._id}
                  memo={memo}
                  onClick={() =>
                    memo.status === "complete"
                      ? navigate(`/memos/${memo._id}`)
                      : null
                  }
                />
              ))}
            </div>
          )}

          {/* Stats summary */}
          {pastMemos.length > 0 && (
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                {
                  label: "Analyses",
                  value: pastMemos.length,
                  Icon: FlaskConical,
                  color: "text-purple-400",
                },
                {
                  label: "Complete",
                  value: pastMemos.filter((m) => m.status === "complete").length,
                  Icon: CheckCircle2,
                  color: "text-emerald-400",
                },
                {
                  label: "Avg Score",
                  value: (() => {
                    const scored = pastMemos.filter(
                      (m) => m?.memo?.investmentScore !== undefined
                    );
                    if (!scored.length) return "—";
                    const avg =
                      scored.reduce((s, m) => s + m.memo.investmentScore, 0) /
                      scored.length;
                    return Math.round(avg);
                  })(),
                  Icon: TrendingUp,
                  color: "text-amber-400",
                },
              ].map(({ label, value, Icon, color }) => (
                <div
                  key={label}
                  className="flex flex-col items-center p-3 bg-zinc-950/60 border border-white/5 rounded-xl"
                >
                  <Icon className={`w-4 h-4 ${color} mb-1`} />
                  <p className="text-base font-bold text-white">{value}</p>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
