import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Sidebar from "./components/Sidebar";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Workspace from "./pages/Workspace";
import ResearchLab from "./pages/ResearchLab";
import InvestmentMemos from "./pages/InvestmentMemos";
import SignalsTab from "./pages/SignalsTab";
import Saved from "./pages/Saved";
import Settings from "./pages/Settings";
import ErrorBoundary from "./components/ErrorBoundary";

// MemoDetail.jsx deleted — /memos/:memoId redirects to /workspace/:memoId

/** Redirect helper: /memos/:memoId → /workspace/:memoId */
function RedirectMemoToWorkspace() {
  const { memoId } = useParams();
  return <Navigate to={`/workspace/${memoId}`} replace />;
}

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("vc_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("vc_theme") || "dark";
  });

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("vc_theme", newTheme);
  };

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("vc_user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("vc_user");
  };

  // Setup theme class on root and body
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light");
      document.body.className = "bg-background text-on-surface antialiased light-theme";
    } else {
      document.documentElement.classList.remove("light");
      document.body.className = "bg-background text-on-surface antialiased dark-theme";
    }
  }, [theme]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: theme === "light" ? "#ffffff" : "#14131a",
              color: theme === "light" ? "#0f172a" : "#f4f4f5",
              border: theme === "light" ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
            },
          }}
        />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/login"
            element={user ? <Navigate to="/workspace" replace /> : <Login onLogin={handleLogin} />}
          />

          {/* Protected routes */}
          <Route
            path="/*"
            element={
              user ? (
                <div className="flex min-h-screen bg-background">
                  <Sidebar user={user} onLogout={handleLogout} />
                  <main className="flex-1 ml-20 lg:ml-64 p-8 min-h-screen relative overflow-y-auto">
                    <Routes>
                      {/* Workspace — base (reads lastMemoId from localStorage) */}
                      <Route
                        path="/workspace"
                        element={<Workspace theme={theme} toggleTheme={toggleTheme} />}
                      />
                      {/* Workspace — specific memo by ID */}
                      <Route
                        path="/workspace/:memoId"
                        element={<Workspace theme={theme} toggleTheme={toggleTheme} />}
                      />
                      {/* Legacy /memos/:memoId → redirect to /workspace/:memoId */}
                      <Route
                        path="/memos/:memoId"
                        element={<RedirectMemoToWorkspace />}
                      />
                      <Route path="/research-lab" element={<ResearchLab />} />
                      <Route path="/memos"        element={<InvestmentMemos />} />
                      <Route path="/signals"      element={<SignalsTab />} />
                      <Route path="/saved"        element={<Saved />} />
                      <Route path="/settings"     element={<Settings />} />
                      <Route path="*"             element={<Navigate to="/workspace" replace />} />
                    </Routes>
                  </main>
                </div>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
