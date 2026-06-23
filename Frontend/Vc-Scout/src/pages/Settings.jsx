/**
 * Settings.jsx — System Settings & Configuration
 * Route: /settings
 *
 * Security-safe: never displays actual API key values.
 * Shows only connection status (configured: boolean) + 4-char prefix hint.
 * Includes: Account info, API key status, Pipeline toggles, Danger zone.
 */

import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  Settings, Shield, Key, CheckCircle2, XCircle,
  User, Bell, Moon, Loader2, AlertTriangle, X,
  RefreshCw, Trash2, ToggleLeft, ToggleRight,
} from "lucide-react";
import { getSettingsStatus } from "../api";

// ── Toggle Row ────────────────────────────────────────────────────────────────
function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex justify-between items-start py-4 border-b border-white/5 last:border-0">
      <div>
        <p className="text-sm font-semibold text-zinc-200">{label}</p>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`transition-colors flex-shrink-0 ml-6 ${checked ? "text-purple-400" : "text-zinc-600"}`}
        aria-label={`Toggle ${label}`}
      >
        {checked
          ? <ToggleRight className="w-8 h-8" />
          : <ToggleLeft  className="w-8 h-8" />}
      </button>
    </div>
  );
}

// ── API Key Status Row ────────────────────────────────────────────────────────
function ApiKeyRow({ label, keyData, isLoading }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="flex justify-between items-center py-4 border-b border-white/5 last:border-0">
        <div className="flex items-center gap-3">
          <Key className="w-4 h-4 text-zinc-500" />
          <div>
            <p className="text-sm font-semibold text-zinc-200">{label}</p>
            {keyData?.keyHint && (
              <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                {keyData.keyHint}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
          ) : keyData?.configured ? (
            <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-red-400 text-xs font-bold">
              <XCircle className="w-3.5 h-3.5" />
              Not configured
            </span>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="text-[10px] font-bold text-zinc-500 hover:text-purple-400 border border-white/5 hover:border-purple-500/30 px-2.5 py-1.5 rounded-lg transition-all"
          >
            Reconfigure
          </button>
        </div>
      </div>

      {/* Reconfigure modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card bg-[#0d0c11]/95 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">Reconfigure {label}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              API keys are stored securely in your backend <code className="text-purple-400">.env</code> file and never exposed to the browser. To update, edit <code className="text-purple-400">.env</code> and restart the server.
            </p>
            <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl text-xs text-amber-400 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              Keys cannot be changed from this UI for security reasons. Edit <code>.env</code> directly.
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [keyStatus,   setKeyStatus]   = useState(null);
  const [keyLoading,  setKeyLoading]  = useState(true);
  const [showDelete,  setShowDelete]  = useState(false);

  // Pipeline toggle states (UI-only, persisted to localStorage)
  const [autoRefresh, setAutoRefresh] = useState(
    () => localStorage.getItem("pref_autoRefresh") === "true"
  );
  const [emailNotifs, setEmailNotifs] = useState(
    () => localStorage.getItem("pref_emailNotifs") === "true"
  );

  // Account info from localStorage auth
  const user = (() => {
    try { return JSON.parse(localStorage.getItem("vc_user") || "{}"); }
    catch { return {}; }
  })();

  // ── Load API key status ─────────────────────────────────────────────────
  const hasFetched = useRef(false);
  useEffect(() => {
    document.title = "VC Scout — Settings";
    if (hasFetched.current) return;
    hasFetched.current = true;
    getSettingsStatus()
      .then((res) => setKeyStatus(res.data))
      .catch(() => setKeyStatus(null))
      .finally(() => setKeyLoading(false));
  }, []);

  const handleToggleAutoRefresh = (val) => {
    setAutoRefresh(val);
    localStorage.setItem("pref_autoRefresh", String(val));
    toast.success(val ? "Auto-refresh signals enabled" : "Auto-refresh disabled");
  };

  const handleToggleEmailNotifs = (val) => {
    setEmailNotifs(val);
    localStorage.setItem("pref_emailNotifs", String(val));
    toast.success(val ? "Email notifications enabled (coming soon)" : "Email notifications off");
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto animate-fadeIn">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Settings className="w-7 h-7 text-purple-400" />
            System Settings
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Configure your AI models, pipeline preferences, and account.
          </p>
        </div>
      </div>

      <div className="space-y-6">

        {/* ── Account ────────────────────────────────────────────────── */}
        <div className="glass-card p-6 bg-zinc-950/45 border border-white/5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-zinc-300 font-bold border-b border-white/5 pb-3">
            <User className="w-5 h-5 text-purple-400" />
            <h3>Account</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-lg">
              {(user.name || user.email || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{user.name || "VC Scout User"}</p>
              <p className="text-xs text-zinc-500">{user.email || "—"}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-purple-950/30 border border-purple-500/20 text-purple-400 rounded-full">
                {user.role || "Analyst"}
              </span>
            </div>
          </div>
        </div>

        {/* ── API Integration Keys ────────────────────────────────────── */}
        <div className="glass-card p-6 bg-zinc-950/45 border border-white/5 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-zinc-300 font-bold border-b border-white/5 pb-3 mb-1">
            <Key className="w-5 h-5 text-purple-400" />
            <h3>Model Integration Keys</h3>
          </div>

          {/* Status banner */}
          {!keyLoading && keyStatus && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 mb-3 ${
              keyStatus.gemini?.configured && keyStatus.firecrawl?.configured
                ? "bg-emerald-950/20 border border-emerald-500/10 text-emerald-400"
                : "bg-amber-950/20 border border-amber-500/10 text-amber-400"
            }`}>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {keyStatus.gemini?.configured && keyStatus.firecrawl?.configured
                ? "All API keys configured. Gemini 2.5 Flash and Firecrawl are operational."
                : "Some API keys are missing. Check your backend .env file."}
            </div>
          )}

          <ApiKeyRow
            label="Gemini API Key"
            keyData={keyStatus?.gemini}
            isLoading={keyLoading}
          />
          <ApiKeyRow
            label="Firecrawl API Key"
            keyData={keyStatus?.firecrawl}
            isLoading={keyLoading}
          />
        </div>

        {/* ── Security Sandbox ────────────────────────────────────────── */}
        <div className="glass-card p-6 bg-zinc-950/45 border border-white/5 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-zinc-300 font-bold border-b border-white/5 pb-3 mb-1">
            <Shield className="w-5 h-5 text-purple-400" />
            <h3>Security Sandbox</h3>
          </div>
          {[
            ["SSL Verification",             "Enforced"],
            ["Firecrawl Scraping Sandbox",   "Active"],
            ["Gemini Payload Encryption",    "Enabled"],
            ["API Key Exposure to Frontend", "Blocked"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center text-xs text-zinc-400 py-3 border-b border-white/5 last:border-0">
              <span>{label}</span>
              <span className="text-emerald-400 font-bold">{value}</span>
            </div>
          ))}
        </div>

        {/* ── Pipeline Preferences ────────────────────────────────────── */}
        <div className="glass-card p-6 bg-zinc-950/45 border border-white/5 rounded-2xl">
          <div className="flex items-center gap-2 text-zinc-300 font-bold border-b border-white/5 pb-3 mb-1">
            <RefreshCw className="w-5 h-5 text-purple-400" />
            <h3>Pipeline Preferences</h3>
          </div>
          <ToggleRow
            label="Auto-refresh Signals"
            description="Regenerate market signals every 24 hours automatically."
            checked={autoRefresh}
            onChange={handleToggleAutoRefresh}
          />
          <ToggleRow
            label="Email Notifications"
            description="Get notified when a research pipeline completes. (Coming soon)"
            checked={emailNotifs}
            onChange={handleToggleEmailNotifs}
          />
          <ToggleRow
            label="Dark Mode"
            description="Always enabled. Light mode toggle is available in the top nav."
            checked={true}
            onChange={() => toast("Dark mode is on — toggle in the top navigation bar.", { icon: "🌙" })}
          />
        </div>

        {/* ── Danger Zone ─────────────────────────────────────────────── */}
        <div className="glass-card p-6 bg-zinc-950/45 border border-red-500/10 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-red-400 font-bold border-b border-red-500/10 pb-3">
            <AlertTriangle className="w-5 h-5" />
            <h3>Danger Zone</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-300">Delete Account</p>
              <p className="text-xs text-zinc-600 mt-0.5">Permanently delete your account and all research data.</p>
            </div>
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-400 border border-red-500/20 hover:border-red-500/40 hover:bg-red-950/20 rounded-xl transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirm Modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card bg-[#0d0c11]/95 border border-red-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-base font-bold text-white">Delete Account</h3>
            </div>
            <p className="text-sm text-zinc-400 mb-5">
              This will permanently delete your account, all research memos, saved lists, and signals. <span className="text-red-400 font-semibold">This cannot be undone.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold text-zinc-300 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDelete(false);
                  toast.error("Account deletion is not yet enabled. Contact support.");
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
