/**
 * Workspace.jsx — Single Memo Viewer + Quick Analysis Entry Point
 * Routes: /workspace  (loads lastMemoId from localStorage)
 *         /workspace/:memoId (loads specific memo)
 *
 * Top: Quick-enrich search bar (existing Workspace functionality preserved)
 * Bottom: Full AI investment memo viewer wired to real API data
 */

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Building2, AlertCircle, Lightbulb, BarChart3,
  TrendingUp, Briefcase, Swords, AlertTriangle,
  DollarSign, Rocket, Github, Globe, Newspaper,
  ChevronDown, ChevronUp, Download, Share2,
  Loader2, CheckCircle2, XCircle, X, Bookmark,
} from "lucide-react";
import {
  API, startResearch, getResearchStatus, getMemo, exportMemoPDF,
  saveMemo, getSavedLists,
} from "../api";

// ── Score Ring (ported from MemoDetail) ──────────────────────────────────────
function ScoreRing({ value = 0, label }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = circ * (value / 100);
  const ringColor = value >= 70 ? "#10b981" : value >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={r} stroke="#27272a" strokeWidth="8" fill="none" />
          <circle
            cx="44" cy="44" r={r}
            stroke={ringColor} strokeWidth="8" fill="none"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-extrabold text-white">{value}</span>
        </div>
      </div>
      <p className="text-xs text-zinc-400 font-medium text-center">{label}</p>
    </div>
  );
}

// ── Memo Section (ported from MemoDetail) ────────────────────────────────────
function MemoSection({ icon: Icon, title, content, color = "text-purple-400" }) {
  if (!content || content.startsWith("Insufficient")) return null;
  return (
    <div className="p-5 bg-zinc-950/60 border border-white/5 rounded-2xl space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed">{content}</p>
    </div>
  );
}

// ── Stat Pill (ported from MemoDetail) ───────────────────────────────────────
function StatPill({ icon: Icon, label, value, color }) {
  if (!value || value === "N/A") return null;
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-950/60 border border-white/5 rounded-xl">
      <Icon className={`w-4 h-4 ${color}`} />
      <div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

// ── Agent Step ────────────────────────────────────────────────────────────────
function AgentStep({ label, desc, status }) {
  return (
    <div className="flex gap-4">
      {status === "done"    && <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />}
      {status === "running" && <Loader2      className="w-4 h-4 text-purple-400 mt-0.5 animate-spin flex-shrink-0" />}
      {status === "failed"  && <XCircle      className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />}
      {(status === "idle" || !status) && (
        <div className="w-4 h-4 mt-0.5 rounded-full border border-zinc-700 flex-shrink-0" />
      )}
      <div className={status === "idle" || !status ? "opacity-30" : ""}>
        <p className={`text-[11px] font-bold uppercase tracking-tight ${
          status === "running" ? "text-purple-400" :
          status === "done"    ? "text-white"       :
          status === "failed"  ? "text-red-400"     : "text-zinc-500"
        }`}>
          {label}
        </p>
        {desc && <p className="text-[10px] text-zinc-600 mt-0.5">{desc}</p>}
      </div>
    </div>
  );
}

// ── VC Match Card ─────────────────────────────────────────────────────────────
function VCCard({ vc, isTop }) {
  const scoreColor =
    vc.matchScore >= 85 ? "text-emerald-400" :
    vc.matchScore >= 70 ? "text-purple-400"  : "text-amber-400";
  return (
    <div className="glass-panel p-6 group hover:bg-white/[0.02] cursor-pointer relative">
      {isTop && (
        <span className="absolute -top-2 right-4 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-emerald-600 text-white rounded-full">
          TOP MATCH
        </span>
      )}
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-black text-white uppercase tracking-tighter">{vc.name}</p>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
            {vc.focus} · {vc.stage}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-xl font-black ${scoreColor}`}>{vc.matchScore}%</p>
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mt-0.5">Match</p>
        </div>
      </div>
      {vc.thesis && (
        <p className="text-xs text-zinc-400 leading-relaxed italic border-l-2 border-purple-500/20 pl-3 py-1 mb-3">
          "{vc.thesis}"
        </p>
      )}
      {vc.recentInvestments?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {vc.recentInvestments.map((inv, i) => (
            <span key={i} className="px-2 py-0.5 bg-zinc-900/60 border border-white/5 rounded-full text-[9px] text-zinc-400">
              {inv}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── VC Modal ──────────────────────────────────────────────────────────────────
function VCModal({ vcs, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-base font-extrabold text-white">All VC Matches</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3">
          {vcs.map((vc, i) => <VCCard key={i} vc={vc} isTop={i === 0} />)}
        </div>
      </div>
    </div>
  );
}

// ── Workspace Skeleton ────────────────────────────────────────────────────────
function WorkspaceSkeleton() {
  return (
    <div className="animate-pulse space-y-12">
      {/* Header skeleton */}
      <div className="flex justify-between items-start mb-16">
        <div className="space-y-3 flex-1">
          <div className="h-10 bg-zinc-900 rounded-xl w-1/3" />
          <div className="h-4 bg-zinc-900 rounded w-1/4" />
        </div>
        <div className="flex gap-3">
          <div className="w-12 h-12 bg-zinc-900 rounded-xl" />
          <div className="w-32 h-12 bg-zinc-900 rounded-xl" />
        </div>
      </div>

      {/* Core Metrics skeleton */}
      <div className="grid grid-cols-3 gap-16 mb-16">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3 border-l border-zinc-850 pl-8">
            <div className="h-3 bg-zinc-900 rounded w-2/3" />
            <div className="h-10 bg-zinc-900 rounded w-1/2" />
          </div>
        ))}
      </div>

      {/* Score rings skeleton */}
      <div className="flex gap-10 p-6 bg-zinc-950/40 border border-white/5 rounded-2xl mb-12 w-fit">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full bg-zinc-900" />
            <div className="h-3 bg-zinc-900 rounded w-16" />
          </div>
        ))}
      </div>

      {/* Memo sections skeleton */}
      <div className="grid md:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-6 bg-zinc-950/45 border border-white/5 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-zinc-900" />
              <div className="h-4 bg-zinc-900 rounded w-24" />
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-zinc-900 rounded w-full" />
              <div className="h-3 bg-zinc-900 rounded w-5/6" />
              <div className="h-3 bg-zinc-900 rounded w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Workspace({ theme, toggleTheme }) {
  const { memoId: paramMemoId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // ── Search bar state (existing quick-enrich flow) ──────────────────────
  const [url, setUrl]             = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const pollRef = useRef(null);

  // ── Memo viewer state ──────────────────────────────────────────────────
  const [memoData,    setMemoData]    = useState(null);
  const [memoLoading, setMemoLoading] = useState(false);
  const [memoError,   setMemoError]   = useState("");
  const [showRaw,     setShowRaw]     = useState(false);
  const [showVCModal, setShowVCModal] = useState(false);
  const [exporting,   setExporting]   = useState(false);

  // ── Save to list state ─────────────────────────────────────────────────
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [saveListName,     setSaveListName]     = useState("Default");
  const [saveNotes,        setSaveNotes]        = useState("");
  const [savedLists,       setSavedLists]       = useState([]);
  const [saving,           setSaving]           = useState(false);

  // Polling ref for running memo
  const memoMemoId = paramMemoId || localStorage.getItem("lastMemoId");
  const lastFetchedId = useRef(null);

  // ── Page Title ──────────────────────────────────────────────────────────
  useEffect(() => {
    document.title = memoData?.companyName ? `VC Scout — ${memoData.companyName}` : "VC Scout — Workspace";
  }, [memoData]);

  // ── Load memo on mount / when memoId changes ───────────────────────────
  useEffect(() => {
    if (!memoMemoId) return;
    if (lastFetchedId.current === memoMemoId) return;
    lastFetchedId.current = memoMemoId;
    setMemoLoading(true);
    setMemoError("");
    getMemo(memoMemoId)
      .then((res) => setMemoData(res.data))
      .catch((err) => setMemoError(err.userMessage || "Failed to load memo."))
      .finally(() => setMemoLoading(false));
  }, [memoMemoId]);

  // Poll if memo is still running
  useEffect(() => {
    if (!memoData || memoData.status === "complete" || memoData.status === "failed") return;
    const interval = setInterval(() => {
      getMemo(memoMemoId)
        .then((res) => {
          setMemoData(res.data);
          if (res.data.status === "complete" || res.data.status === "failed") {
            clearInterval(interval);
            if (res.data.status === "complete") toast.success("✅ Pipeline complete!");
          }
        })
        .catch(() => clearInterval(interval));
    }, 3000);
    return () => clearInterval(interval);
  }, [memoData?.status, memoMemoId]);

  // ── Auto-trigger from query param ─────────────────────────────────────
  useEffect(() => {
    const query = searchParams.get("query");
    if (query) {
      setUrl(query);
      handleAnalyze(query);
      setSearchParams({});
    }
  }, [searchParams]);

  // ── handleAnalyze (existing quick-enrich pipeline) ────────────────────
  const handleAnalyze = async (targetUrl) => {
    const rawInput = (targetUrl || url).trim();
    if (!rawInput) {
      toast.error("Please enter a company name or website URL");
      return;
    }

    let resolvedUrl = rawInput;
    let companyName = null;

    const looksLikeUrl =
      rawInput.startsWith("http") ||
      rawInput.startsWith("www.") ||
      /\.[a-z]{2,}(\b|\/)/.test(rawInput);

    if (!looksLikeUrl) {
      companyName = rawInput.charAt(0).toUpperCase() + rawInput.slice(1).toLowerCase();
      resolvedUrl = `https://www.${rawInput.toLowerCase().replace(/\s+/g, "")}.com`;
      toast(`Trying ${resolvedUrl}`, { icon: "🔍", duration: 3000 });
    } else {
      if (!resolvedUrl.startsWith("http")) resolvedUrl = "https://" + resolvedUrl;
    }

    const domainName = resolvedUrl
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split(".")[0];
    const normalizedName = companyName || (domainName.charAt(0).toUpperCase() + domainName.slice(1));

    setIsAnalyzing(true);
    setCurrentStep(1);

    if (pollRef.current) clearInterval(pollRef.current);

    try {
      const startRes = await startResearch(normalizedName, resolvedUrl);
      const newMemoId = startRes.data.memoId;

      // Save to localStorage and navigate to /workspace/:memoId
      localStorage.setItem("lastMemoId", newMemoId);
      navigate(`/workspace/${newMemoId}`);

      setCurrentStep(2);

      // Poll for pipeline completion
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await getResearchStatus(newMemoId);
          const d = statusRes.data;

          const synthStatus = d.agentStatus?.synthesizerAgent?.status;
          if (synthStatus === "running") setCurrentStep(4);

          if (d.status === "complete") {
            clearInterval(pollRef.current);
            setCurrentStep(5);
            setIsAnalyzing(false);
            setMemoData(null); // Trigger reload of memo with fresh data
            getMemo(newMemoId).then((res) => setMemoData(res.data));
            toast.success(`✅ Analysis complete! Score: ${d.memo?.investmentScore ?? "–"}/100`);
          } else if (d.status === "failed") {
            clearInterval(pollRef.current);
            setCurrentStep(5);
            setIsAnalyzing(false);
            getMemo(newMemoId).then((res) => setMemoData(res.data));
            toast.error("Pipeline failed — memo may have partial data.");
          }
        } catch (pollErr) {
          console.error("Poll error:", pollErr);
        }
      }, 3000);

      // Safety timeout: 3 minutes
      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          setIsAnalyzing(false);
        }
      }, 180000);

    } catch (err) {
      setCurrentStep(0);
      setIsAnalyzing(false);
      toast.error(err.userMessage || err.message || "Analysis failed");
    }
  };

  // ── PDF Export ─────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (!memoData || memoData.status !== "complete") {
      toast.error("Memo must be complete to export PDF.");
      return;
    }
    setExporting(true);
    const toastId = toast.loading("Downloading PDF...");
    try {
      const res = await exportMemoPDF(memoData._id);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${memoData.companyName.replace(/\s+/g, "-").toLowerCase()}-memo.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded!", { id: toastId });
    } catch {
      toast.error("PDF export failed.", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  // ── Share ──────────────────────────────────────────────────────────────
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  // ── Open save dropdown — prefetch list names ───────────────────────────
  const openSaveDropdown = async () => {
    setShowSaveDropdown(true);
    try {
      const res = await getSavedLists();
      setSavedLists(res.data.lists || []);
    } catch { /* ignore — will show Default */ }
  };

  // ── Save to list ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!memoData?._id) return;
    setSaving(true);
    try {
      const res = await saveMemo(memoData._id, saveListName || "Default", saveNotes);
      if (res.data.alreadySaved) {
        toast("Already in your saved list", { icon: "📌" });
      } else {
        toast.success(`Saved to ${saveListName || "Default"}!`);
      }
      setShowSaveDropdown(false);
      setSaveNotes("");
    } catch {
      toast.error("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Derived data from memoData ─────────────────────────────────────────
  const m  = memoData?.memo     || {};
  const ag = memoData?.agentStatus || {};
  const vc = memoData?.vcMatches || [];

  const MEMO_SECTIONS = [
    { icon: Building2,    title: "Overview",       content: m.overview,       color: "text-purple-400" },
    { icon: AlertCircle,  title: "Problem",         content: m.problem,        color: "text-red-400" },
    { icon: Lightbulb,    title: "Solution",        content: m.solution,       color: "text-amber-400" },
    { icon: BarChart3,    title: "Market",           content: m.market,         color: "text-blue-400" },
    { icon: TrendingUp,   title: "Traction",        content: m.traction,       color: "text-emerald-400" },
    { icon: Briefcase,    title: "Business Model",  content: m.businessModel,  color: "text-cyan-400" },
    { icon: Swords,       title: "Competition",     content: m.competition,    color: "text-orange-400" },
    { icon: AlertTriangle,title: "Risks",           content: m.risks,          color: "text-red-400" },
  ];

  const AGENT_STEPS = [
    { key: "webAgent",         label: "Domain Analysis",     desc: "Scraped website content" },
    { key: "newsAgent",        label: "News Intelligence",   desc: "Searched DuckDuckGo press" },
    { key: "githubAgent",      label: "GitHub Signals",      desc: "Stars, forks, commit activity" },
    { key: "synthesizerAgent", label: "Synthesizing Thesis", desc: "Gemini AI memo generation" },
    { key: "vcMatchingAgent",  label: "VC Matching",         desc: "Best-fit investor identification" },
  ];

  return (
    <div className="bg-background text-on-surface antialiased pt-24">
      {/* ── Top Navigation ─────────────────────────────────────────────── */}
      <header className="fixed top-0 right-0 left-20 lg:left-64 h-20 bg-background/80 backdrop-blur-md border-b border-white/5 z-40 px-10 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_8px_#48f3d1]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-secondary/80">
              {memoData?.companyName || "Workspace"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="text-on-surface-variant/50 hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-surface-container-low"
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            <span className="material-symbols-outlined text-[22px]">
              {theme === "light" ? "dark_mode" : "light_mode"}
            </span>
          </button>
          <span className="material-symbols-outlined text-on-surface-variant/50 text-[22px] cursor-pointer hover:text-primary transition-colors">notifications</span>
          <button
            onClick={() => navigate("/research-lab")}
            className="bg-primary text-black text-[11px] font-extrabold uppercase tracking-widest px-6 py-3 rounded-full hover:shadow-[0_0_20px_rgba(202,190,255,0.3)] transition-all active:scale-95"
          >
            New Analysis
          </button>
        </div>
      </header>

      {/* ── Hero Search Bar ─────────────────────────────────────────────── */}
      <section className="mb-12 text-center max-w-4xl mx-auto py-12">
        <h1 className="text-5xl font-black mb-6 tracking-tight text-white">Quick Company Enrichment</h1>
        <p className="text-on-surface-variant/50 mb-12 text-xl font-medium text-zinc-400">
          Fast website scrape + AI extraction. For a full investment memo, use{" "}
          <span className="text-purple-400 font-bold">Research Lab</span>.
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); handleAnalyze(); }}
          className="search-container relative flex items-center p-2.5 bg-surface-container/30 border border-white/5 rounded-[40px] backdrop-blur-3xl transition-all duration-500 max-w-2xl mx-auto focus-within:border-primary/30"
        >
          <span className="material-symbols-outlined absolute left-8 text-on-surface-variant/30">link</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isAnalyzing}
            className="w-full bg-transparent border-none focus:ring-0 pl-16 pr-6 text-sm text-white placeholder-on-surface-variant/20 focus:outline-none"
            placeholder="Paste startup URL or search company name..."
            type="text"
          />
          <button
            type="submit"
            disabled={isAnalyzing}
            className="bg-white text-black text-[11px] font-black uppercase tracking-widest px-10 py-4 rounded-full hover:bg-primary transition-colors shadow-2xl disabled:opacity-50 cursor-pointer"
          >
            {isAnalyzing ? "Analyzing..." : "Analyze"}
          </button>
        </form>

        <div className="mt-8 flex justify-center gap-8 text-[10px] font-bold text-on-surface-variant/30 uppercase tracking-[0.2em]">
          {["vercel.com", "linear.app", "perplexity.ai"].map((s) => (
            <span
              key={s}
              onClick={() => { setUrl(s); handleAnalyze(s); }}
              className="cursor-pointer hover:text-primary transition-colors text-zinc-500 hover:text-zinc-300"
            >
              {s.split(".")[0].charAt(0).toUpperCase() + s.split(".")[0].slice(1)}
            </span>
          ))}
        </div>
      </section>

      {/* ── Pipeline Visualizer ─────────────────────────────────────────── */}
      <section className="mb-24 px-4">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/30">Active Research Pipeline</h2>
          <div className="text-[10px] font-bold text-secondary flex items-center gap-2.5 px-4 py-1.5 bg-secondary/5 border border-secondary/10 rounded-full">
            <span className={`w-1.5 h-1.5 rounded-full bg-secondary ${isAnalyzing ? "animate-pulse" : ""}`} />
            {isAnalyzing ? "RUNNING" : "AGENT CLUSTER ACTIVE"}
          </div>
        </div>
        <div className="relative flex items-center justify-between gap-2 max-w-5xl mx-auto">
          <div className="absolute inset-x-0 top-[28px] h-[1px] flow-line opacity-30 pointer-events-none" />
          {[
            { icon: "rocket_launch", label: "Startup",    sub: "Verified" },
            { icon: "public",        label: "Web Agent",  sub: currentStep === 1 ? "Crawling..." : currentStep > 1 ? "Complete" : "Idle" },
            { icon: "feed",          label: "News Agent", sub: currentStep === 2 ? "Scanned" : currentStep > 2 ? "Complete" : "Queued" },
            { icon: "code",          label: "GitHub",     sub: currentStep === 3 ? "Indexing" : currentStep > 3 ? "Complete" : "Idle" },
            { icon: "psychology",    label: "Synthesizer",sub: currentStep === 4 ? "Writing..." : currentStep > 4 ? "Complete" : "Waiting" },
            { icon: "description",   label: "Final Memo", sub: currentStep === 5 ? "Ready" : "Locked" },
          ].map((node, i) => (
            <div key={i} className={`relative z-10 flex flex-col items-center gap-4 group ${i > 0 && currentStep < i ? "opacity-45" : ""}`}>
              <div className={`w-14 h-14 rounded-2xl bg-surface border border-white/10 flex items-center justify-center text-on-surface-variant group-hover:border-primary/40 transition-all ${
                currentStep === i && i > 0 ? "bg-primary/10 border-primary/40 text-primary agent-pulse" : ""
              }`}>
                <span className="material-symbols-outlined text-[20px]">{node.icon}</span>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-white uppercase tracking-tighter">{node.label}</p>
                <p className={`text-[9px] font-medium uppercase tracking-tighter mt-0.5 ${currentStep === i && i > 0 ? "text-primary/60" : "text-zinc-500"}`}>
                  {node.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Memo Viewer ─────────────────────────────────────────────────── */}
      <div id="memo-section" className="grid grid-cols-1 lg:grid-cols-10 gap-16">

        {/* ── CENTER / LEFT (70%) ──────────────────────────────────────── */}
        <div className="lg:col-span-7 space-y-12">
          <div className="glass-panel premium-border p-16 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />

            {/* ── Header ─────────────────────────────────────────────── */}
            <header className="flex justify-between items-start mb-16 relative">
              <div>
                <div className="flex items-center gap-5 mb-4">
                  <h2 className="text-5xl font-black tracking-tight text-white">
                    {memoData?.companyName || "—"}
                  </h2>
                  {m.fundingStage && (
                    <span className="bg-secondary/10 text-secondary text-[10px] font-black px-4 py-1.5 rounded-full border border-secondary/20 uppercase tracking-widest">
                      {m.fundingStage}
                    </span>
                  )}
                </div>
                <p className="text-on-surface-variant/40 font-bold uppercase tracking-widest text-[11px] text-zinc-500">
                  Investment Memorandum • Confidential • {new Date().getFullYear()}
                </p>
                {memoData?.websiteUrl && (
                  <a
                    href={memoData.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:underline font-mono mt-1 block"
                  >
                    {memoData.websiteUrl.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
              <div className="flex gap-3 relative">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2.5 bg-white/5 px-5 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                {/* Save to List button — only when complete */}
                {memoData?.status === "complete" && (
                  <div className="relative">
                    <button
                      onClick={() => showSaveDropdown ? setShowSaveDropdown(false) : openSaveDropdown()}
                      className="flex items-center gap-2 bg-white/5 px-5 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-purple-500/10 hover:border-purple-500/30 transition-all border border-white/5"
                    >
                      <Bookmark className="w-4 h-4 text-purple-400" />
                      Save
                    </button>

                    {/* Inline Save dropdown */}
                    {showSaveDropdown && (
                      <div className="absolute right-0 top-14 z-50 w-72 bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-white">Save to List</p>
                          <button onClick={() => setShowSaveDropdown(false)} className="p-1 hover:bg-white/5 rounded-lg">
                            <X className="w-3.5 h-3.5 text-zinc-500" />
                          </button>
                        </div>

                        {/* List name input with datalist */}
                        <div>
                          <label className="text-[10px] text-zinc-500 uppercase tracking-wider">List Name</label>
                          <input
                            list="saved-lists"
                            value={saveListName}
                            onChange={(e) => setSaveListName(e.target.value)}
                            placeholder="Default"
                            className="w-full mt-1 px-3 py-2 bg-zinc-900/60 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 transition-all placeholder:text-zinc-600"
                          />
                          <datalist id="saved-lists">
                            {savedLists.map(l => <option key={l} value={l} />)}
                          </datalist>
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Notes (optional)</label>
                          <textarea
                            value={saveNotes}
                            onChange={(e) => setSaveNotes(e.target.value)}
                            placeholder="Why are you saving this startup?"
                            rows={2}
                            className="w-full mt-1 px-3 py-2 bg-zinc-900/60 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 transition-all placeholder:text-zinc-600 resize-none"
                          />
                        </div>

                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className="w-3.5 h-3.5" />}
                          {saving ? "Saving…" : "Save to List"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleExportPDF}
                  disabled={exporting || !memoData || memoData.status !== "complete"}
                  className="flex items-center gap-2.5 bg-white text-black px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-primary transition-all disabled:opacity-50"
                >
                  {exporting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Download className="w-4 h-4" />}
                  Export PDF
                </button>
              </div>
            </header>

            {/* ── Loading / Error / Running states ───────────────────── */}
            {memoLoading && <WorkspaceSkeleton />}

            {!memoLoading && memoError && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <AlertTriangle className="w-10 h-10 text-red-400" />
                <p className="text-sm text-zinc-400">{memoError}</p>
                <p className="text-xs text-zinc-600">
                  Run a research pipeline in{" "}
                  <Link to="/research-lab" className="text-purple-400 hover:underline">Research Lab</Link>{" "}
                  to generate your first memo.
                </p>
              </div>
            )}

            {!memoLoading && !memoError && memoData && memoData.status !== "complete" && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                <p className="text-sm font-semibold text-zinc-300">
                  Research pipeline is running…
                </p>
                <p className="text-xs text-zinc-600">Polling every 3 seconds. Results will appear automatically.</p>
              </div>
            )}

            {!memoLoading && !memoError && !memoMemoId && !memoData && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <Globe className="w-10 h-10 text-zinc-600" />
                <p className="text-sm text-zinc-400 font-semibold">No memo selected</p>
                <p className="text-xs text-zinc-600">
                  Select a memo from your past analyses or run a new research pipeline.
                </p>
                <button
                  onClick={() => navigate("/research-lab")}
                  className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all mt-2"
                >
                  Go to Research Lab
                </button>
              </div>
            )}

            {/* ── Core Metrics ─────────────────────────────────────── */}
            {memoData?.status === "complete" && (
              <>
                <div className="grid grid-cols-3 gap-16 mb-16">
                  <div className="space-y-2 border-l border-primary/20 pl-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">AI Confidence Score</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-5xl font-black text-primary">{m.confidenceScore ?? "—"}</p>
                      {m.confidenceScore != null && <span className="text-primary/40 font-bold text-xl">%</span>}
                    </div>
                  </div>
                  <div className="space-y-2 border-l border-white/5 pl-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Total Addressable Market</p>
                    <p className="text-5xl font-black text-white">{m.totalAddressableMarket || "—"}</p>
                  </div>
                  <div className="space-y-2 border-l border-white/5 pl-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">ARR / Traction Signal</p>
                    <p className="text-5xl font-black text-secondary">{m.arr || "—"}</p>
                  </div>
                </div>

                {/* Score rings */}
                <div className="flex gap-10 p-6 bg-zinc-950/40 border border-white/5 rounded-2xl mb-12 w-fit">
                  <ScoreRing value={m.investmentScore ?? 0} label="Investment Score" />
                  <ScoreRing value={m.confidenceScore  ?? 0} label="Confidence Score" />
                </div>

                {/* Stat pills */}
                <div className="flex flex-wrap gap-3 mb-12">
                  <StatPill icon={DollarSign} label="TAM"           value={m.totalAddressableMarket} color="text-emerald-400" />
                  <StatPill icon={TrendingUp} label="ARR Signal"    value={m.arr}                    color="text-blue-400" />
                  <StatPill icon={Rocket}     label="Funding Stage" value={m.fundingStage}            color="text-purple-400" />
                  {memoData?.rawData?.githubData?.repoUrl && (
                    <a
                      href={memoData.rawData.githubData.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 bg-zinc-950/60 border border-white/5 rounded-xl hover:border-purple-500/30 transition-all"
                    >
                      <Github className="w-4 h-4 text-zinc-400" />
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wide">GitHub</p>
                        <p className="text-sm font-semibold text-white">
                          ⭐ {memoData.rawData.githubData.stars ?? 0} · 🍴 {memoData.rawData.githubData.forks ?? 0}
                        </p>
                      </div>
                    </a>
                  )}
                </div>

                {/* Memo sections grid */}
                <div className="grid md:grid-cols-2 gap-4 mb-12">
                  {MEMO_SECTIONS.map((s) => <MemoSection key={s.title} {...s} />)}
                </div>

                {/* News articles */}
                {memoData?.rawData?.newsArticles?.length > 0 && (
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-2">
                      <Newspaper className="w-4 h-4 text-zinc-500" />
                      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">News Sources</h3>
                    </div>
                    {memoData.rawData.newsArticles.map((article, i) => (
                      <a
                        key={i}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-4 bg-zinc-950/60 border border-white/5 rounded-xl hover:border-purple-500/20 transition-all"
                      >
                        <p className="text-sm font-medium text-white line-clamp-1">{article.title}</p>
                        {article.summary && (
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{article.summary}</p>
                        )}
                      </a>
                    ))}
                  </div>
                )}

                {/* Raw web content accordion */}
                {memoData?.rawData?.webContent && (
                  <div className="border border-white/5 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setShowRaw((p) => !p)}
                      className="w-full flex items-center justify-between p-4 bg-zinc-950/60 hover:bg-zinc-900/60 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-zinc-500" />
                        <span className="text-sm font-medium text-zinc-300">Raw Web Content</span>
                        <span className="text-xs text-zinc-600">
                          ({memoData.rawData.webContent.length.toLocaleString()} chars)
                        </span>
                      </div>
                      {showRaw ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                    </button>
                    {showRaw && (
                      <pre className="p-4 text-xs text-zinc-500 bg-zinc-950 overflow-auto max-h-64 whitespace-pre-wrap font-mono">
                        {memoData.rawData.webContent}
                      </pre>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR (30%) ──────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-14">

          {/* Best-Fit Investors */}
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-8 px-2">
              Best-Fit Investors
            </h2>
            {memoLoading ? (
              <div className="space-y-4">
                {[0, 1].map((i) => (
                  <div key={i} className="p-6 bg-zinc-950/45 border border-white/5 rounded-2xl animate-pulse space-y-3">
                    <div className="h-4 bg-zinc-900 rounded w-2/3" />
                    <div className="h-3 bg-zinc-900 rounded w-1/3" />
                    <div className="h-12 bg-zinc-900 rounded" />
                  </div>
                ))}
              </div>
            ) : vc.length > 0 ? (
              <div className="space-y-4">
                {vc.slice(0, 2).map((v, i) => <VCCard key={i} vc={v} isTop={i === 0} />)}
                <button
                  onClick={() => setShowVCModal(true)}
                  className="w-full py-3.5 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:bg-white/5 hover:text-white transition-all"
                >
                  View All {vc.length} Matches
                </button>
              </div>
            ) : (
              <div className="p-6 bg-zinc-950/50 border border-white/5 rounded-xl text-center">
                <p className="text-xs text-zinc-600">
                  {memoData?.status === "complete"
                    ? "VC matching not yet available for this memo."
                    : "VC matches will appear after pipeline completes."}
                </p>
              </div>
            )}
          </section>

          {/* AI Reasoning Lab */}
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-8 px-2">
              AI Reasoning Lab
            </h2>
            <div className="space-y-6 px-2">
              {AGENT_STEPS.map(({ key, label, desc }) => (
                <AgentStep
                  key={key}
                  label={label}
                  desc={desc}
                  status={ag[key]?.status || "idle"}
                />
              ))}
            </div>
          </section>

          {/* Research Lab CTA */}
          {memoData?.status === "complete" && (
            <section className="p-5 bg-purple-950/30 border border-purple-500/20 rounded-2xl space-y-3">
              <p className="text-sm font-bold text-white">Run another research?</p>
              <p className="text-xs text-zinc-500">
                Full 4-agent pipeline + VC matching in <span className="text-purple-400 font-semibold">Research Lab</span>.
              </p>
              <a
                href="/research-lab"
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all w-full justify-center"
              >
                Open Research Lab
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </a>
            </section>
          )}
        </div>
      </div>

      {/* VC Modal */}
      {showVCModal && <VCModal vcs={vc} onClose={() => setShowVCModal(false)} />}
    </div>
  );
}
