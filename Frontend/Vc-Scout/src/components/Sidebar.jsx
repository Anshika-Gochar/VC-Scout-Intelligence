import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";

export default function Sidebar({ user, onLogout }) {
  const location = useLocation();

  const navItems = [
    { path: "/workspace", label: "Workspace", icon: "grid_view" },
    { path: "/research-lab", label: "Research Lab", icon: "biotech" },
    { path: "/memos", label: "Investment Memos", icon: "description" },
    { path: "/signals", label: "Signals", icon: "sensors" },
    { path: "/saved", label: "Saved", icon: "bookmark" },
    { path: "/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 lg:w-64 bg-background/50 backdrop-blur-2xl border-r border-outline-variant z-50 flex flex-col">
      {/* Logo */}
      <Link to="/workspace" className="p-6 lg:p-10 block hover:opacity-90 transition-opacity">
        <h1 className="text-xl font-bold tracking-tight text-on-surface flex items-center justify-center lg:justify-start gap-2">
          <span className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center text-on-primary text-[10px] font-bold flex-shrink-0">V</span>
          <span className="lg:block hidden">VC Scout</span>
        </h1>
        <p className="text-[9px] text-primary/60 uppercase tracking-[0.3em] mt-2 font-bold pl-8 lg:block hidden">Intelligence</p>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-3 lg:px-6 py-4 space-y-2">
        {navItems.map((item) => {
          const isActive = item.path === "/workspace"
            ? location.pathname.startsWith("/workspace")
            : location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-center lg:justify-start gap-3.5 px-4 py-3.5 rounded-xl transition-all cursor-pointer block ${
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                  : "text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container-low"
              }`}
              title={item.label}
            >
              <span className="material-symbols-outlined text-[20px] flex-shrink-0">{item.icon}</span>
              <span className="text-sm font-medium lg:block hidden truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User profile & theme toggler at the bottom */}
      <div className="p-4 lg:p-8 border-t border-outline-variant">
        <div className="flex lg:flex-row flex-col items-center justify-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-[10px] font-bold border border-outline-variant ring-1 ring-white/5 text-on-surface flex-shrink-0" title={user?.name}>
              {user?.name?.split(" ").map(n => n[0]).join("") || "AM"}
            </div>
            <div className="lg:block hidden min-w-0">
              <p className="text-xs font-semibold text-on-surface truncate">{user?.name || "Alex Mercer"}</p>
              <p className="text-[10px] text-on-surface-variant/50 font-medium truncate">{user?.role || "General Partner"}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg text-on-surface-variant/50 hover:text-red-400 hover:bg-surface-container-low transition-all cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
