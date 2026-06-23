/**
 * SignalsTab.jsx — Live Market Intelligence Signals
 * Route: /signals
 *
 * Loads AI-generated signals from GET /api/signals (24h cached).
 * "MONITOR ACTIVE" badge triggers a force-refresh via POST /api/signals/refresh.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import {
  Activity, Github, Globe, Layers, DollarSign,
  ShieldCheck, Newspaper, ArrowUpRight, RefreshCw,
  AlertTriangle, Loader2,
} from "lucide-react";
import { getSignals, refreshSignals } from "../api";

// ── Type config (icon + colors) ───────────────────────────────────────────────
const TYPE_CONFIG = {
  talent:     { Icon: Layers,      ring: "bg-emerald-950/50 border-emerald-500/20 text-emerald-400", bar: "bg-emerald-500", badge: "text-emerald-400" },
  code:       { Icon: Github,      ring: "bg-purple-950/50 border-purple-500/20 text-purple-400",   bar: "bg-purple-500",  badge: "text-purple-400" },
  web:        { Icon: Globe,       ring: "bg-blue-950/50 border-blue-500/20 text-blue-400",         bar: "bg-blue-500",    badge: "text-blue-400" },
  funding:    { Icon: DollarSign,  ring: "bg-amber-950/50 border-amber-500/20 text-amber-400",      bar: "bg-amber-500",   badge: "text-amber-400" },
  compliance: { Icon: ShieldCheck, ring: "bg-green-950/50 border-green-500/20 text-green-400",      bar: "bg-green-500",   badge: "text-green-400" },
  news:       { Icon: Newspaper,   ring: "bg-indigo-950/50 border-indigo-500/20 text-indigo-400",   bar: "bg-indigo-500",  badge: "text-indigo-400" },
};

const TABS = [
  { id: "all",        label: "All Signals" },
  { id: "talent",     label: "Talent Spikes" },
  { id: "code",       label: "Code Repos" },
  { id: "web",        label: "Web Presence" },
  { id: "funding",    label: "Funding" },
  { id: "compliance", label: "Compliance" },
  { id: "news",       label: "News" },
];

// ── Deterministic sparkline heights seeded from confidenceScore ───────────────
function sparkBars(confidenceScore) {
  const seed = confidenceScore || 80;
  return [
    Math.round(20 + (seed * 0.3) % 30),
    Math.round(35 + (seed * 0.7) % 40),
    Math.round(25 + (seed * 0.5) % 35),
    Math.round(50 + (seed * 0.4) % 30),
    Math.round(40 + (seed * 0.9) % 45),
  ];
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="glass-card p-6 bg-zinc-950/45 border border-white/5 rounded-2xl animate-pulse space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-zinc-800" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 w-28 bg-zinc-800 rounded" />
          <div className="h-2.5 w-16 bg-zinc-900 rounded" />
        </div>
        <div className="h-5 w-20 bg-zinc-900 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-3.5 w-40 bg-zinc-800 rounded" />
        <div className="h-3 w-full bg-zinc-900 rounded" />
        <div className="h-3 w-4/5 bg-zinc-900 rounded" />
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex gap-1">
          {[0,1,2,3,4].map(i => <div key={i} className="w-1 h-5 bg-zinc-800 rounded" />)}
        </div>
        <div className="h-3 w-20 bg-zinc-900 rounded" />
      </div>
    </div>
  );
}

// ── Signal Card ───────────────────────────────────────────────────────────────
function SignalCard({ signal }) {
  const cfg  = TYPE_CONFIG[signal.type] || TYPE_CONFIG.news;
  const { Icon } = cfg;
  const bars = sparkBars(signal.confidenceScore);

  return (
    <div className="glass-card p-6 bg-zinc-950/45 border border-white/5 rounded-2xl flex flex-col justify-between hover:border-purple-500/30 transition-all group">
      <div className="space-y-4">
        {/* Company row */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${cfg.ring}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">{signal.companyName}</h4>
                <span className="text-[9px] text-zinc-500">•</span>
                <span className={`text-[10px] font-semibold uppercase ${cfg.badge}`}>
                  {signal.category || signal.type}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">{signal.timeAgo}</p>
            </div>
          </div>
          <span className="badge badge-purple flex-shrink-0">
            {signal.confidenceScore}% Confidence
          </span>
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <h5 className="text-sm font-bold text-zinc-100">{signal.headline}</h5>
          <p className="text-xs text-zinc-400 leading-relaxed">{signal.description}</p>
        </div>
      </div>

      {/* Sparkline + metric */}
      <div className="flex items-center justify-between pt-5 mt-5 border-t border-white/5">
        <div className="flex items-end gap-1 h-7">
          {bars.map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-t-sm ${cfg.bar}`}
              style={{ height: `${h * 0.22}px`, opacity: 0.35 + i * 0.15 }}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
              {signal.metricLabel || "SIGNAL"}
            </p>
            <p className="text-xs font-bold text-white">{signal.metricValue || "—"}</p>
          </div>
          <div className="w-7 h-7 rounded-lg bg-white/2 border border-white/5 flex items-center justify-center text-zinc-400 group-hover:bg-purple-500/10 group-hover:border-purple-500/20 group-hover:text-purple-400 transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SignalsTab() {
  const [signals,       setSignals]       = useState([]);
  const [activeTab,     setActiveTab]     = useState("all");
  const [isLoading,     setIsLoading]     = useState(true);
  const [isRefreshing,  setIsRefreshing]  = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [cached,        setCached]        = useState(false);
  const [error,         setError]         = useState("");

  // ── Load on mount ───────────────────────────────────────────────────────
  const loadSignals = useCallback(async (typeFilter) => {
    try {
      const res = await getSignals(typeFilter);
      setSignals(res.data.signals || []);
      setLastGenerated(res.data.generatedAt);
      setCached(res.data.cached);
      setError("");
    } catch (err) {
      setError(err.userMessage || "Failed to load signals.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const hasFetched = useRef(false);
  useEffect(() => {
    document.title = "VC Scout — Live Signals";
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadSignals();
  }, [loadSignals]);

  // ── Tab filter (client-side for speed) ─────────────────────────────────
  const filtered = activeTab === "all"
    ? signals
    : signals.filter((s) => s.type === activeTab);

  // ── Force refresh ───────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await refreshSignals();
      setSignals(res.data.signals || []);
      setLastGenerated(res.data.generatedAt);
      setCached(false);
      setActiveTab("all");
      toast.success("Signals refreshed successfully");
    } catch (err) {
      toast.error(err.userMessage || "Refresh failed. Try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fadeIn">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Live Discovery Signals</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time alerts, market shifts, and engineering traction vectors.
            {lastGenerated && (
              <span className="ml-2 text-zinc-600 text-xs">
                {cached ? "Cached" : "Generated"}{" "}
                {new Date(lastGenerated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="badge badge-purple flex items-center gap-1.5 animate-pulseGlow cursor-pointer hover:bg-purple-500/20 transition-all disabled:opacity-60"
        >
          {isRefreshing
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Activity className="w-3.5 h-3.5" />}
          {isRefreshing ? "REFRESHING…" : "MONITOR ACTIVE"}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 border-b border-white/5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-purple-600/15 border-purple-500/30 text-purple-300"
                : "bg-zinc-950/40 border-white/5 hover:border-white/10 text-zinc-400"
            }`}
          >
            {tab.label}
            {tab.id !== "all" && signals.length > 0 && (
              <span className="ml-1.5 text-[9px] text-zinc-600">
                {signals.filter(s => s.type === tab.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex items-center gap-3 p-4 bg-red-950/20 border border-red-500/20 rounded-xl text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid md:grid-cols-2 gap-6">
          {[0,1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Activity className="w-10 h-10 text-zinc-700" />
          <p className="text-sm text-zinc-400">No signals for this category yet.</p>
          <button
            onClick={() => setActiveTab("all")}
            className="text-xs text-purple-400 hover:underline"
          >
            View all signals →
          </button>
        </div>
      )}

      {/* Signal cards */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          {filtered.map((sig, i) => (
            <SignalCard key={sig._id || i} signal={sig} />
          ))}
        </div>
      )}
    </div>
  );
}
