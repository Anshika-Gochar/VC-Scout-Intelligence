/**
 * InvestmentMemos.jsx — Investment Memo List Page
 * Route: /memos
 *
 * Shows all AI-generated research memos for the current user.
 * Data source: GET /api/research/memos
 */

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FileText, Search, Download, Trash2, ExternalLink,
  Loader2, FlaskConical, TrendingUp, DollarSign,
  Rocket, CheckCircle2, XCircle, Clock, AlertCircle,
} from "lucide-react";
import { getMemos, deleteMemo, exportMemoPDF } from "../api";

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    complete: { icon: CheckCircle2, label: "Complete", cls: "text-emerald-400 bg-emerald-950/30 border-emerald-500/30" },
    running:  { icon: Loader2,      label: "Running",  cls: "text-blue-400 bg-blue-950/30 border-blue-500/30" },
    failed:   { icon: XCircle,      label: "Failed",   cls: "text-red-400 bg-red-950/30 border-red-500/30" },
    pending:  { icon: Clock,        label: "Pending",  cls: "text-zinc-400 bg-zinc-900/40 border-white/5" },
  }[status] || { icon: AlertCircle, label: status, cls: "text-zinc-400 bg-zinc-900/40 border-white/5" };

  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${cfg.cls}`}>
      <Icon className={`w-3 h-3 ${status === "running" ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

// ── Score Chip ────────────────────────────────────────────────────────────────
function ScoreChip({ value, label }) {
  if (value == null) return null;
  const color = value >= 70 ? "text-emerald-400" : value >= 40 ? "text-amber-400" : "text-red-400";
  return (
    <div className="flex flex-col items-center">
      <span className={`text-xl font-extrabold ${color}`}>{value}</span>
      <span className="text-[9px] text-zinc-500 uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="p-5 bg-zinc-950/50 border border-white/5 rounded-2xl animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-zinc-800" />
        <div className="space-y-1.5 flex-1">
          <div className="h-4 w-32 bg-zinc-800 rounded" />
          <div className="h-3 w-24 bg-zinc-900 rounded" />
        </div>
      </div>
      <div className="h-10 bg-zinc-900 rounded-xl" />
      <div className="flex gap-2">
        <div className="h-8 flex-1 bg-zinc-900 rounded-xl" />
        <div className="h-8 w-8 bg-zinc-900 rounded-xl" />
        <div className="h-8 w-8 bg-zinc-900 rounded-xl" />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function InvestmentMemos() {
  const navigate = useNavigate();
  const [memos,   setMemos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [deleting, setDeleting] = useState(null);   // memoId being deleted
  const [exporting, setExporting] = useState(null); // memoId being exported

  // ── Load memos ──────────────────────────────────────────────────────────
  const hasFetched = useRef(false);
  useEffect(() => {
    document.title = "VC Scout — Memos";
    if (hasFetched.current) return;
    hasFetched.current = true;
    getMemos()
      .then((res) => setMemos(res.data.memos || []))
      .catch(() => toast.error("Failed to load memos."))
      .finally(() => setLoading(false));
  }, []);

  // ── Download PDF ────────────────────────────────────────────────────────
  const handleExport = async (memo) => {
    if (memo.status !== "complete") {
      toast.error("Memo must be complete before exporting.");
      return;
    }
    setExporting(memo._id);
    const toastId = toast.loading("Downloading PDF...");
    try {
      const res = await exportMemoPDF(memo._id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${memo.companyName.replace(/\s+/g, "-").toLowerCase()}-memo.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded!", { id: toastId });
    } catch {
      toast.error("PDF export failed. Try again.", { id: toastId });
    } finally {
      setExporting(null);
    }
  };

  // ── Delete memo ─────────────────────────────────────────────────────────
  const handleDelete = async (memo) => {
    if (!window.confirm(`Delete memo for "${memo.companyName}"? This cannot be undone.`)) return;
    setDeleting(memo._id);
    try {
      await deleteMemo(memo._id);
      setMemos((prev) => prev.filter((m) => m._id !== memo._id));
      toast.success("Memo deleted");
    } catch {
      toast.error("Delete failed. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  // ── Filter ──────────────────────────────────────────────────────────────
  const filtered = memos.filter((m) =>
    m.companyName.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-purple-400" />
            Investment Memos
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            AI-generated research memos — full pipeline output with VC matching
          </p>
        </div>
        <button
          onClick={() => navigate("/research-lab")}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all"
        >
          <FlaskConical className="w-4 h-4" />
          New Research
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search memos by company name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/60 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition-all placeholder:text-zinc-600"
        />
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900/60 border border-white/5 flex items-center justify-center">
            <FlaskConical className="w-7 h-7 text-zinc-600" />
          </div>
          <div>
            <p className="text-base font-semibold text-zinc-300">
              {search ? "No memos match your search" : "No memos yet"}
            </p>
            <p className="text-sm text-zinc-600 mt-1">
              {search ? "Try a different company name" : "Run your first research pipeline to generate an AI investment memo."}
            </p>
          </div>
          {!search && (
            <button
              onClick={() => navigate("/research-lab")}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-all mt-2"
            >
              <FlaskConical className="w-4 h-4" />
              Go to Research Lab
            </button>
          )}
        </div>
      )}

      {/* Memo grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((memo) => {
            const m = memo.memo || {};
            const initial = memo.companyName?.charAt(0)?.toUpperCase() || "?";
            const dateStr = new Date(memo.createdAt).toLocaleDateString("en-GB", {
              day: "2-digit", month: "short", year: "numeric"
            });

            return (
              <div
                key={memo._id}
                className="group flex flex-col gap-4 p-5 bg-zinc-950/50 border border-white/5 rounded-2xl hover:border-purple-500/20 transition-all duration-200"
              >
                {/* Company header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{memo.companyName}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">{dateStr}</p>
                    </div>
                  </div>
                  <StatusBadge status={memo.status} />
                </div>

                {/* Stage + TAM */}
                {(m.fundingStage || m.totalAddressableMarket || m.arr) && (
                  <div className="flex flex-wrap gap-2">
                    {m.fundingStage && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-purple-950/30 border border-purple-500/20 rounded-lg text-[10px] text-purple-300 font-medium">
                        <Rocket className="w-3 h-3" />{m.fundingStage}
                      </span>
                    )}
                    {m.totalAddressableMarket && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-[10px] text-emerald-400 font-medium">
                        <DollarSign className="w-3 h-3" />{m.totalAddressableMarket}
                      </span>
                    )}
                    {m.arr && m.arr !== "N/A" && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-blue-950/20 border border-blue-500/20 rounded-lg text-[10px] text-blue-400 font-medium">
                        <TrendingUp className="w-3 h-3" />{m.arr}
                      </span>
                    )}
                  </div>
                )}

                {/* Scores */}
                {(m.investmentScore != null || m.confidenceScore != null) && (
                  <div className="flex items-center gap-6 px-4 py-3 bg-zinc-900/40 rounded-xl border border-white/5">
                    <ScoreChip value={m.investmentScore} label="Inv. Score" />
                    <div className="w-px h-8 bg-white/5" />
                    <ScoreChip value={m.confidenceScore} label="Confidence" />
                  </div>
                )}

                {/* Overview excerpt */}
                {m.overview && (
                  <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                    {m.overview}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => navigate(`/workspace/${memo._id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-600/90 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Memo
                  </button>
                  <button
                    onClick={() => handleExport(memo)}
                    disabled={exporting === memo._id || memo.status !== "complete"}
                    title="Export PDF"
                    className="w-9 h-9 flex items-center justify-center bg-zinc-900/60 border border-white/5 hover:border-purple-500/30 text-zinc-400 hover:text-white rounded-xl transition-all disabled:opacity-40"
                  >
                    {exporting === memo._id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Download className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(memo)}
                    disabled={deleting === memo._id}
                    title="Delete memo"
                    className="w-9 h-9 flex items-center justify-center bg-zinc-900/60 border border-white/5 hover:border-red-500/30 text-zinc-500 hover:text-red-400 rounded-xl transition-all disabled:opacity-40"
                  >
                    {deleting === memo._id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
