/**
 * Saved.jsx — Saved Startup Playlists
 * Route: /saved
 *
 * Displays researched startups the user has bookmarked into named lists.
 * Data source: GET /api/saved (populates Memo reference with scores + VC data).
 * Left: list name tabs. Right: grid of saved startup cards.
 */

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Bookmark, Plus, Trash2, ExternalLink, FolderPlus,
  Loader2, TrendingUp, DollarSign, Rocket, X,
  FileJson, AlertTriangle, Star,
} from "lucide-react";
import { getSaved, deleteSaved } from "../api";

// ── Score chip ────────────────────────────────────────────────────────────────
function ScoreChip({ value, label }) {
  if (value == null) return null;
  const color = value >= 70 ? "text-emerald-400" : value >= 40 ? "text-amber-400" : "text-red-400";
  return (
    <div className="flex flex-col items-center">
      <span className={`text-lg font-extrabold ${color}`}>{value}</span>
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
          <div className="h-3 w-20 bg-zinc-900 rounded" />
        </div>
      </div>
      <div className="h-10 bg-zinc-900 rounded-xl" />
      <div className="flex gap-2">
        <div className="h-8 flex-1 bg-zinc-900 rounded-xl" />
        <div className="h-8 w-8 bg-zinc-900 rounded-xl" />
      </div>
    </div>
  );
}

// ── Export helper ─────────────────────────────────────────────────────────────
function exportListJSON(listName, items) {
  const data = items.map(({ memo, notes, savedAt }) => ({
    companyName:           memo?.companyName,
    fundingStage:          memo?.memo?.fundingStage,
    investmentScore:       memo?.memo?.investmentScore,
    confidenceScore:       memo?.memo?.confidenceScore,
    totalAddressableMarket:memo?.memo?.totalAddressableMarket,
    topVCMatch:            memo?.vcMatches?.[0]?.name,
    savedAt,
    notes,
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${listName.replace(/\s+/g, "-").toLowerCase()}-saved.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Saved() {
  const navigate = useNavigate();

  const [listsMap,  setListsMap]  = useState({});   // { listName: [items] }
  const [listNames, setListNames] = useState([]);   // ordered list names
  const [activeList, setActiveList] = useState("All");
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [removing,  setRemoving]  = useState(null); // savedMemoId being removed

  // ── Load saved memos ────────────────────────────────────────────────────
  const loadSaved = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getSaved();
      const map  = res.data.lists || {};
      setListsMap(map);
      setListNames(Object.keys(map).sort());
    } catch (err) {
      setError(err.userMessage || "Failed to load saved startups.");
    } finally {
      setLoading(false);
    }
  };

  const hasFetched = useRef(false);
  useEffect(() => {
    document.title = "VC Scout — Saved";
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadSaved();
  }, []);

  // ── Remove from saved ───────────────────────────────────────────────────
  const handleRemove = async (savedMemoId, companyName) => {
    if (!window.confirm(`Remove "${companyName}" from saved?`)) return;
    setRemoving(savedMemoId);
    try {
      await deleteSaved(savedMemoId);
      // Optimistic update
      const updated = {};
      for (const [key, items] of Object.entries(listsMap)) {
        const filtered = items.filter(i => i.savedMemoId !== savedMemoId);
        if (filtered.length > 0) updated[key] = filtered;
      }
      setListsMap(updated);
      setListNames(Object.keys(updated).sort());
      if (activeList !== "All" && !updated[activeList]) setActiveList("All");
      toast.success(`Removed "${companyName}" from saved.`);
    } catch {
      toast.error("Failed to remove. Please try again.");
    } finally {
      setRemoving(null);
    }
  };

  // ── Compute items to display ────────────────────────────────────────────
  const allItems = Object.values(listsMap).flat();
  const displayItems = activeList === "All"
    ? allItems
    : listsMap[activeList] || [];

  const totalCount = allItems.length;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fadeIn">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Bookmark className="w-7 h-7 text-purple-400" />
            Saved Playlists
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Bookmarked startups from your research pipeline.{" "}
            {!loading && totalCount > 0 && (
              <span className="text-zinc-600">{totalCount} startup{totalCount !== 1 ? "s" : ""} saved.</span>
            )}
          </p>
        </div>
        <button
          onClick={() => navigate("/research-lab")}
          className="btn-primary px-4 py-2 text-xs"
        >
          <Plus className="w-4 h-4" />
          New Research
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-950/20 border border-red-500/20 rounded-xl text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex gap-8">
          {/* Sidebar skeleton */}
          <div className="w-52 flex-shrink-0 space-y-2">
            {[0,1,2].map(i => <div key={i} className="h-9 bg-zinc-900/40 border border-white/5 rounded-xl animate-pulse" />)}
          </div>
          {/* Cards skeleton */}
          <div className="flex-1 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0,1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
          </div>
        </div>
      )}

      {/* Empty state — no saved memos at all */}
      {!loading && !error && totalCount === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900/60 border border-white/5 flex items-center justify-center">
            <FolderPlus className="w-7 h-7 text-zinc-600" />
          </div>
          <div>
            <p className="text-base font-semibold text-zinc-300">No startups saved yet</p>
            <p className="text-sm text-zinc-600 mt-1">
              Go to Workspace, open a completed memo, and click{" "}
              <span className="text-purple-400 font-semibold">Save to List</span>.
            </p>
          </div>
          <button
            onClick={() => navigate("/workspace")}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-all mt-2"
          >
            Open Workspace
          </button>
        </div>
      )}

      {/* Main layout: sidebar + cards */}
      {!loading && !error && totalCount > 0 && (
        <div className="flex gap-8 items-start">

          {/* ── List sidebar ─────────────────────────────────────────── */}
          <div className="w-52 flex-shrink-0 space-y-1.5">
            {/* All tab */}
            <button
              onClick={() => setActiveList("All")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeList === "All"
                  ? "bg-purple-600/15 border border-purple-500/30 text-purple-300"
                  : "bg-zinc-950/40 border border-white/5 hover:border-white/10 text-zinc-400"
              }`}
            >
              <span>All Saved</span>
              <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded-md">{totalCount}</span>
            </button>

            {/* Per-list tabs */}
            {listNames.map((name) => {
              const count = listsMap[name]?.length || 0;
              return (
                <button
                  key={name}
                  onClick={() => setActiveList(name)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeList === name
                      ? "bg-purple-600/15 border border-purple-500/30 text-purple-300"
                      : "bg-zinc-950/40 border border-white/5 hover:border-white/10 text-zinc-400"
                  }`}
                >
                  <span className="truncate">{name}</span>
                  <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded-md flex-shrink-0">{count}</span>
                </button>
              );
            })}

            {/* Export active list */}
            {activeList !== "All" && listsMap[activeList]?.length > 0 && (
              <button
                onClick={() => exportListJSON(activeList, listsMap[activeList])}
                className="w-full flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold text-zinc-500 hover:text-white border border-white/5 hover:border-white/10 transition-all mt-2"
              >
                <FileJson className="w-3 h-3" />
                Export JSON
              </button>
            )}
          </div>

          {/* ── Startup cards grid ───────────────────────────────────── */}
          <div className="flex-1">
            {displayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <p className="text-sm text-zinc-500">No startups in this list yet.</p>
                <button
                  onClick={() => navigate("/workspace")}
                  className="text-xs text-purple-400 hover:underline"
                >
                  Open Workspace to save startups →
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayItems.map((item) => {
                  const memo     = item.memo || {};
                  const memoData = memo.memo || {};
                  const topVC    = memo.vcMatches?.[0];
                  const initial  = memo.companyName?.charAt(0)?.toUpperCase() || "?";
                  const dateStr  = new Date(item.savedAt).toLocaleDateString("en-GB", {
                    day: "2-digit", month: "short", year: "numeric",
                  });

                  return (
                    <div
                      key={item.savedMemoId}
                      className="flex flex-col gap-4 p-5 bg-zinc-950/50 border border-white/5 rounded-2xl hover:border-purple-500/20 transition-all duration-200 group"
                    >
                      {/* Company header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">
                              {memo.companyName || "Unknown"}
                            </p>
                            <p className="text-[10px] text-zinc-600 mt-0.5">Saved {dateStr}</p>
                          </div>
                        </div>
                        {item.listName && item.listName !== "Default" && (
                          <span className="flex-shrink-0 px-2 py-0.5 text-[9px] font-bold bg-purple-950/30 border border-purple-500/20 text-purple-400 rounded-full">
                            {item.listName}
                          </span>
                        )}
                      </div>

                      {/* Funding stage + TAM */}
                      <div className="flex flex-wrap gap-2">
                        {memoData.fundingStage && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-purple-950/30 border border-purple-500/20 rounded-lg text-[10px] text-purple-300 font-medium">
                            <Rocket className="w-3 h-3" />{memoData.fundingStage}
                          </span>
                        )}
                        {memoData.totalAddressableMarket && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-[10px] text-emerald-400 font-medium">
                            <DollarSign className="w-3 h-3" />{memoData.totalAddressableMarket}
                          </span>
                        )}
                      </div>

                      {/* Scores */}
                      {(memoData.investmentScore != null || memoData.confidenceScore != null) && (
                        <div className="flex items-center gap-6 px-4 py-3 bg-zinc-900/40 rounded-xl border border-white/5">
                          <ScoreChip value={memoData.investmentScore} label="Inv. Score" />
                          <div className="w-px h-6 bg-white/5" />
                          <ScoreChip value={memoData.confidenceScore} label="Confidence" />
                        </div>
                      )}

                      {/* Top VC match */}
                      {topVC && (
                        <div className="flex items-center gap-2 p-3 bg-zinc-900/30 border border-white/5 rounded-xl">
                          <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Top VC Match</p>
                            <p className="text-xs font-semibold text-white truncate">
                              {topVC.name}
                              <span className="text-emerald-400 ml-1">{topVC.matchScore}%</span>
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {item.notes && (
                        <p className="text-xs text-zinc-500 italic leading-relaxed line-clamp-2">
                          "{item.notes}"
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => navigate(`/workspace/${memo._id}`)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-600/90 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open Memo
                        </button>
                        <button
                          onClick={() => handleRemove(item.savedMemoId, memo.companyName)}
                          disabled={removing === item.savedMemoId}
                          title="Remove from saved"
                          className="w-9 h-9 flex items-center justify-center bg-zinc-900/60 border border-white/5 hover:border-red-500/30 text-zinc-500 hover:text-red-400 rounded-xl transition-all disabled:opacity-40"
                        >
                          {removing === item.savedMemoId
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
        </div>
      )}
    </div>
  );
}
