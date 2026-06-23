import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, ShieldCheck, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { API } from "../api";
import { toast } from "react-hot-toast";

export default function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  // Handle session expiration toast
  useEffect(() => {
    if (window.location.search.includes("expired=true")) {
      toast.error("Session expired. Please log in again.");
      navigate(window.location.pathname, { replace: true });
    }
  }, [navigate]);

  // Animated mesh background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId;
    let time = 0;
    const particles = [];
    const particleCount = 60;

    function resize() {
      canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
      canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * 1200,
        y: Math.random() * 900,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 0.5,
        color: Math.random() > 0.5 ? "rgba(202,190,255," : "rgba(72,243,209,"
      });
    }

    resize();
    window.addEventListener("resize", resize);

    function draw() {
      time += 0.003;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      ctx.clearRect(0, 0, w, h);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(202,190,255,${0.06 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + (0.3 + Math.sin(time * 2 + p.x * 0.01) * 0.2) + ")";
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const res = await API.post("/auth/register", { name, email, password });
        toast.success("Account created successfully!");
        onLogin({ 
          ...res.data.user,
          token: res.data.token
        });
      } else {
        const res = await API.post("/auth/login", { email, password });
        toast.success("Welcome back!");
        onLogin({ 
          ...res.data.user,
          token: res.data.token
        });
      }
      navigate("/workspace");
    } catch (err) {
      toast.error(err.userMessage || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setOauthLoading(provider);
    try {
      const mockOAuthData = {
        email: `alex.${provider}@mercer.vc`,
        name: "Alex Mercer",
        provider,
        providerId: `oauth_${provider}_${Math.floor(Math.random() * 1000000)}`,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=Alex`
      };
      const res = await API.post("/auth/oauth", mockOAuthData);
      toast.success(`Logged in with ${provider}`);
      onLogin({ 
        ...res.data.user,
        token: res.data.token
      });
      navigate("/workspace");
    } catch (err) {
      toast.error(err.userMessage || `OAuth with ${provider} failed`);
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#07060a] overflow-hidden">
      {/* Animated canvas background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.6 }}
      />

      {/* Radial glow accents */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/8 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/6 blur-[150px] pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-[440px] z-10 px-6">
        
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            AI Venture Operating System
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">VC Scout</h1>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary/40">Intelligence Platform</p>
        </div>

        {/* Glass Card */}
        <div className="glass-panel premium-border p-8 relative overflow-hidden">
          {/* Inner glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
          
          {/* Tab Toggle */}
          <div className="flex mb-8 bg-white/[0.03] rounded-xl p-1 border border-white/5">
            <button
              onClick={() => setIsSignup(false)}
              className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-300 ${
                !isSignup 
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/5" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignup(true)}
              className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-300 ${
                isSignup 
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/5" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleOAuth("google")}
              disabled={oauthLoading !== null}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm font-medium text-zinc-300 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300 group disabled:opacity-50"
            >
              {oauthLoading === "google" ? (
                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleOAuth("github")}
              disabled={oauthLoading !== null}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm font-medium text-zinc-300 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300 group disabled:opacity-50"
            >
              {oauthLoading === "github" ? (
                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="white">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  <span>Continue with GitHub</span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">or continue with email</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field (signup only) */}
            {isSignup && (
              <div className="animate-fadeIn">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required={isSignup}
                    placeholder="Alex Mercer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_rgba(202,190,255,0.08)] transition-all placeholder:text-zinc-700"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2">
                Work Email
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="alex@mercer.vc"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_rgba(202,190,255,0.08)] transition-all placeholder:text-zinc-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2">
                {isSignup ? "Create Password" : "Password"}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_rgba(202,190,255,0.08)] transition-all placeholder:text-zinc-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isSignup && (
              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="w-4 h-4 rounded border border-white/10 bg-white/[0.02] flex items-center justify-center group-hover:border-primary/30 transition-colors">
                    <input type="checkbox" className="sr-only peer" />
                  </div>
                  <span className="group-hover:text-zinc-400 transition-colors">Remember session</span>
                </label>
                <a href="#" className="hover:text-primary transition-colors font-medium">Forgot password?</a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3.5 bg-primary text-on-primary text-[11px] font-black uppercase tracking-[0.15em] rounded-xl hover:shadow-[0_0_30px_-5px_rgba(202,190,255,0.3)] transition-all duration-300 flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              ) : (
                <>
                  {isSignup ? "Create Account" : "Enter Operating System"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-600">
            <ShieldCheck className="w-3.5 h-3.5 text-secondary/60" />
            <span>Secure end-to-end encrypted intelligence</span>
          </div>
          <p className="text-[10px] text-zinc-700">
            By continuing, you agree to VC Scout's{" "}
            <a href="#" className="text-zinc-500 hover:text-primary transition-colors">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="text-zinc-500 hover:text-primary transition-colors">Privacy Policy</a>
          </p>
        </div>
      </div>

      {/* Inline animation styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
