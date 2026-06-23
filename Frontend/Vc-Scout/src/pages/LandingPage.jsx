import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();
  const shaderCanvasRef = useRef(null);
  const networkCanvasRef = useRef(null);
  const [activeTab, setActiveTab] = useState("Platform");

  // WebGL Shader Effect
  useEffect(() => {
    const canvas = shaderCanvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return;

    let animationFrameId;

    const vs = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fs = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;

      varying vec2 v_texCoord;

      float fraction(float x) { return x - floor(x); }

      void main() {
          vec2 uv = v_texCoord;
          
          vec3 color1 = vec3(0.047, 0.051, 0.086); // Background Surface
          vec3 color2 = vec3(0.486, 0.361, 0.988); // Primary Purple
          vec3 color3 = vec3(0.078, 0.851, 0.722); // Secondary Emerald
          vec3 color4 = vec3(0.365, 0.663, 1.0);   // Accent Blue
          
          float t = u_time * 0.2;
          
          float w1 = sin(uv.x * 2.0 + t) * 0.5 + 0.5;
          float w2 = sin(uv.y * 3.0 - t * 1.5) * 0.5 + 0.5;
          float w3 = sin((uv.x + uv.y) * 1.5 + t * 0.8) * 0.5 + 0.5;
          
          vec3 finalColor = color1;
          finalColor = mix(finalColor, color2, w1 * 0.3 * (1.0 - uv.y));
          finalColor = mix(finalColor, color3, w2 * 0.2 * uv.x);
          finalColor = mix(finalColor, color4, w3 * 0.2 * (1.0 - uv.x));
          
          float noise = fraction(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
          finalColor += noise * 0.02;
          
          float dist = distance(uv, vec2(0.5));
          finalColor *= 1.0 - dist * 0.5;

          gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    function createShader(gl, type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    }

    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uRes = gl.getUniformLocation(program, "u_resolution");

    function resize() {
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    window.addEventListener("resize", resize);
    resize();

    function render(t) {
      gl.uniform1f(uTime, t * 0.001);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    }
    render(0);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // 2D Canvas Neural Network Simulation (Mocking the Three.js cluster)
  useEffect(() => {
    const canvas = networkCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    const nodeCount = 40;
    const nodes = [];

    // Initialize nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400,
        z: (Math.random() - 0.5) * 400,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        vz: (Math.random() - 0.5) * 0.5,
      });
    }

    let angleY = 0.002;
    let angleX = 0.001;

    function resize() {
      const w = canvas.clientWidth || 600;
      const h = canvas.clientHeight || 600;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    window.addEventListener("resize", resize);
    resize();

    function project3d(x, y, z, cx, cy) {
      // Simple perspective projection
      const fov = 400;
      const scale = fov / (fov + z + 200);
      return {
        x: cx + x * scale,
        y: cy + y * scale,
        scale: scale,
      };
    }

    function rotateY(node, angle) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x = node.x * cos - node.z * sin;
      const z = node.z * cos + node.x * sin;
      node.x = x;
      node.z = z;
    }

    function rotateX(node, angle) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const y = node.y * cos - node.z * sin;
      const z = node.z * cos + node.y * sin;
      node.y = y;
      node.z = z;
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Update positions and apply rotation
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;
        node.z += node.vz;

        // Bounce within box boundaries
        if (Math.abs(node.x) > 200) node.vx *= -1;
        if (Math.abs(node.y) > 200) node.vy *= -1;
        if (Math.abs(node.z) > 200) node.vz *= -1;

        rotateY(node, angleY);
        rotateX(node, angleX);
      });

      // Draw lines between close nodes
      ctx.strokeStyle = "rgba(124, 92, 252, 0.15)";
      ctx.lineWidth = 1;
      for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dz = nodes[i].z - nodes[j].z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < 120) {
            const p1 = project3d(nodes[i].x, nodes[i].y, nodes[i].z, cx, cy);
            const p2 = project3d(nodes[j].x, nodes[j].y, nodes[j].z, cx, cy);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach((node) => {
        const p = project3d(node.x, node.y, node.z, cx, cy);
        
        ctx.beginPath();
        const size = Math.max(1, 4 * p.scale);
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        
        // Glowing effect
        ctx.fillStyle = "rgba(124, 92, 252, 0.8)";
        ctx.shadowColor = "#7c5cfc";
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      animationFrameId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="bg-background text-on-surface font-body-md selection:bg-primary/30 min-h-screen">
      {/* Top Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-xl border-b border-white/10 shadow-sm h-20">
        <div className="flex justify-between items-center px-margin-desktop h-full max-w-container-max mx-auto">
          <div className="font-display-md text-display-md tracking-tighter text-on-surface">VC Scout Intelligence</div>
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => setActiveTab("Platform")}
              className={`${activeTab === "Platform" ? "text-primary font-bold border-b-2 border-primary" : "text-on-surface-variant font-medium"} pb-1 transition-all duration-300`}
            >
              Platform
            </button>
            <button
              onClick={() => setActiveTab("Features")}
              className={`${activeTab === "Features" ? "text-primary font-bold border-b-2 border-primary" : "text-on-surface-variant font-medium"} pb-1 transition-all duration-300`}
            >
              Features
            </button>
            <button
              onClick={() => setActiveTab("Memos")}
              className={`${activeTab === "Memos" ? "text-primary font-bold border-b-2 border-primary" : "text-on-surface-variant font-medium"} pb-1 transition-all duration-300`}
            >
              Memos
            </button>
            <button
              onClick={() => setActiveTab("Pricing")}
              className={`${activeTab === "Pricing" ? "text-primary font-bold border-b-2 border-primary" : "text-on-surface-variant font-medium"} pb-1 transition-all duration-300`}
            >
              Pricing
            </button>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-on-surface font-medium hover:text-primary transition-colors">
              Login
            </Link>
            <Link to="/login" className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-bold transition-all active:scale-95 shadow-lg shadow-primary/20">
              Get Access
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 w-full h-full opacity-40">
          <canvas ref={shaderCanvasRef} className="block w-full h-full" />
        </div>

        <div className="relative z-10 w-full max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 lg:grid-cols-2 gap-gutter items-center">
          <div className="max-w-2xl">
            <span className="inline-block py-1 px-4 rounded-full border border-primary/30 bg-primary/10 text-primary font-label-md text-xs mb-6 tracking-widest uppercase">
              Next-Gen Investment AI
            </span>
            <h1 className="font-display-lg text-display-lg mb-6 leading-tight text-white text-5xl md:text-6xl font-extrabold">
              AI Agents That Think Like Venture Capitalists
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-10 leading-relaxed text-zinc-400">
              Research startups, generate investment memos, monitor signals, and match founders with the right investors—all automatically with the power of VC-optimized neural networks.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/login" className="bg-primary text-on-primary px-8 py-4 rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-primary/40 transition-all flex items-center gap-2">
                Get Started
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </Link>
              <button className="glass-panel text-on-surface px-8 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined">play_circle</span>
                Watch Demo
              </button>
            </div>
          </div>

          <div className="relative hidden lg:block h-[600px]">
            <canvas ref={networkCanvasRef} className="absolute inset-0 w-full h-full" />
            <div className="absolute -bottom-10 -right-10 glass-panel p-6 rounded-2xl border border-primary/20 shadow-2xl animate-bounce" style={{ animationDuration: "4s" }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Active Analysis</span>
              </div>
              <div className="text-sm font-medium">Synthesizing Project Nebula Memo...</div>
              <div className="w-full bg-white/10 h-1 mt-3 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-secondary w-3/4 h-full" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Trusted By Marquee */}
      <section className="py-20 bg-surface-container-lowest overflow-hidden">
        <div className="max-w-container-max mx-auto px-margin-desktop mb-10">
          <h3 className="text-center text-on-surface-variant font-label-md uppercase tracking-widest text-xs font-semibold">
            Powering the world's leading firms
          </h3>
        </div>
        <div className="flex animate-marquee whitespace-nowrap gap-20 items-center opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="flex gap-20 items-center px-10">
            <span className="font-display-md text-3xl font-bold">SEQUOIA</span>
            <span className="font-display-md text-3xl font-bold">a16z</span>
            <span className="font-display-md text-3xl font-bold">Benchmark</span>
            <span className="font-display-md text-3xl font-bold">Accel</span>
            <span className="font-display-md text-3xl font-bold">Greylock</span>
            <span className="font-display-md text-3xl font-bold">Index</span>
            <span className="font-display-md text-3xl font-bold">Founders Fund</span>
          </div>
          <div className="flex gap-20 items-center px-10">
            <span className="font-display-md text-3xl font-bold">SEQUOIA</span>
            <span className="font-display-md text-3xl font-bold">a16z</span>
            <span className="font-display-md text-3xl font-bold">Benchmark</span>
            <span className="font-display-md text-3xl font-bold">Accel</span>
            <span className="font-display-md text-3xl font-bold">Greylock</span>
            <span className="font-display-md text-3xl font-bold">Index</span>
            <span className="font-display-md text-3xl font-bold">Founders Fund</span>
          </div>
        </div>
      </section>

      {/* Interactive AI Agent Demo */}
      <section className="py-32 bg-background relative overflow-hidden">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="text-center mb-20">
            <h2 className="font-display-md text-display-md mb-4 text-4xl font-extrabold text-white">Autonomous Intelligence Stack</h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto text-zinc-400">
              Our agents operate independently to provide a level of depth human analysts can't reach in real-time.
            </p>
          </div>
          <div className="glass-panel p-8 md:p-12 rounded-[2rem] border border-white/10 shadow-2xl relative">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
              {/* Agent Step 1 */}
              <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 transition-colors group">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-4xl">public</span>
                </div>
                <h4 className="text-xl font-bold mb-3 text-white">Web Intelligence Agent</h4>
                <p className="text-sm text-on-surface-variant text-zinc-400">
                  Scours technical docs, social sentiment, and historical founder data across 200+ sources.
                </p>
              </div>

              {/* Connector (Desktop) */}
              <div className="absolute hidden lg:flex top-1/2 left-[31%] -translate-y-1/2 text-primary/30">
                <span className="material-symbols-outlined text-4xl">trending_flat</span>
              </div>

              {/* Agent Step 2 */}
              <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-secondary/50 transition-colors group">
                <div className="w-16 h-16 rounded-2xl bg-secondary/20 flex items-center justify-center mb-6 text-secondary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-4xl">rss_feed</span>
                </div>
                <h4 className="text-xl font-bold mb-3 text-white">Market Signal Monitor</h4>
                <p className="text-sm text-on-surface-variant text-zinc-400">
                  Monitors hiring trends, patent filings, and competitor pivots in sub-millisecond cycles.
                </p>
              </div>

              {/* Connector (Desktop) */}
              <div className="absolute hidden lg:flex top-1/2 left-[64%] -translate-y-1/2 text-secondary/30">
                <span className="material-symbols-outlined text-4xl">trending_flat</span>
              </div>

              {/* Agent Step 3 */}
              <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-white/20 group">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6 text-on-surface group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                  <span className="material-symbols-outlined text-4xl">psychology</span>
                </div>
                <h4 className="text-xl font-bold mb-3 text-white">AI Memo Synthesizer</h4>
                <p className="text-sm text-on-surface-variant text-zinc-400">
                  Generates institutional-grade investment memos with automated risk/reward modeling.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="py-32 bg-surface-container-low">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="flex justify-between items-end mb-16">
            <div className="max-w-xl">
              <h2 className="font-display-md text-display-md mb-4 leading-tight text-4xl font-extrabold text-white">Investment Superpowers</h2>
              <p className="text-on-surface-variant text-zinc-400">
                Outperform the market with data depth usually reserved for top-tier sovereign wealth funds.
              </p>
            </div>
            <button className="hidden md:block text-primary font-bold border-b border-primary hover:border-b-2 transition-all pb-1">
              View All Capabilities
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {/* Card 1 */}
            <div className="gradient-border group">
              <div className="gradient-border-content p-8 h-full flex flex-col">
                <span className="material-symbols-outlined text-4xl text-primary mb-6">radar</span>
                <h3 className="text-2xl font-bold mb-4 text-white">Autonomous Sourcing</h3>
                <p className="text-on-surface-variant mb-8 leading-relaxed text-zinc-400">
                  AI scans GitHub repos, stealth-mode LinkedIn updates, and cryptic domains to find winners 6 months before Seed.
                </p>
                <div className="mt-auto pt-4 border-t border-white/10">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-sm text-on-surface/70">
                      <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
                      Stealth-mode tracking
                    </li>
                    <li className="flex items-center gap-3 text-sm text-on-surface/70">
                      <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
                      Talent migration alerts
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            {/* Card 2 */}
            <div className="gradient-border group">
              <div className="gradient-border-content p-8 h-full flex flex-col">
                <span className="material-symbols-outlined text-4xl text-secondary mb-6">microwave</span>
                <h3 className="text-2xl font-bold mb-4 text-white">Deep Due Diligence</h3>
                <p className="text-on-surface-variant mb-8 leading-relaxed text-zinc-400">
                  Automated background checks, market sizing, and competitive landscape mapping in minutes, not weeks.
                </p>
                <div className="mt-auto pt-4 border-t border-white/10">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-sm text-on-surface/70">
                      <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
                      Cap table simulations
                    </li>
                    <li className="flex items-center gap-3 text-sm text-on-surface/70">
                      <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
                      Market-fit scoring
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            {/* Card 3 */}
            <div className="gradient-border group">
              <div className="gradient-border-content p-8 h-full flex flex-col">
                <span className="material-symbols-outlined text-4xl text-tertiary mb-6">hub</span>
                <h3 className="text-2xl font-bold mb-4 text-white">Real-time Signals</h3>
                <p className="text-on-surface-variant mb-8 leading-relaxed text-zinc-400">
                  Receive instant notifications on portfolio companies' hiring freezes, negative sentiment, or breakout growth spikes.
                </p>
                <div className="mt-auto pt-4 border-t border-white/10">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-sm text-on-surface/70">
                      <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
                      Sentiment monitoring
                    </li>
                    <li className="flex items-center gap-3 text-sm text-on-surface/70">
                      <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
                      Competitor pivot tracking
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Investment Memo Preview Section */}
      <section className="py-32 bg-background relative">
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="font-display-md text-display-md mb-6 leading-tight text-4xl font-extrabold text-white">
              Institutional-Grade Memos, Generated in Seconds
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 leading-relaxed text-zinc-400">
              Stop spending weekends writing reports. Our AI synthesizes data into beautiful, structured investment memos that are ready for your investment committee.
            </p>
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 text-primary">
                  <span className="material-symbols-outlined">description</span>
                </div>
                <div>
                  <h5 className="font-bold text-white">Project Nebula Preview</h5>
                  <p className="text-sm text-on-surface-variant text-zinc-400">14-page deep dive on GenAI infrastructure with risk assessment.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0 text-secondary">
                  <span className="material-symbols-outlined">analytics</span>
                </div>
                <div>
                  <h5 className="font-bold text-white">Automated Valuation Modeling</h5>
                  <p className="text-sm text-on-surface-variant text-zinc-400">Includes Monte Carlo simulations for exit scenarios.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-primary/20 blur-3xl opacity-20"></div>
            <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden h-[600px] flex flex-col">
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-secondary"></div>
                  <div>
                    <h4 className="font-bold text-lg text-white">Project Nebula</h4>
                    <p className="text-xs text-primary uppercase font-bold tracking-widest">Series A | Infrastructure</p>
                  </div>
                </div>
                <div className="bg-secondary/20 text-secondary text-xs px-3 py-1 rounded-full font-bold">Strong Buy (94/100)</div>
              </div>
              <div className="space-y-8 flex-1 overflow-y-auto pr-4 scrollbar-hide">
                <div className="space-y-3">
                  <h5 className="text-on-surface font-bold text-sm uppercase tracking-wider">Executive Summary</h5>
                  <p className="text-sm text-on-surface-variant leading-relaxed text-zinc-400">
                    Nebula is building a proprietary low-latency inference layer for edge computing. Initial traction shows a 40% reduction in token cost compared to industry benchmarks. Founders have prior exits at CoreWeave and NVIDIA.
                  </p>
                </div>
                <div className="space-y-3">
                  <h5 className="text-on-surface font-bold text-sm uppercase tracking-wider">Market Analysis</h5>
                  <div className="w-full h-32 rounded-xl bg-cover bg-center border border-white/5 opacity-80" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBqKW-jXeUUDZRQT4fcw2_yaZ-qgEgyOG8yeCQ94klzRKHXjB0sziYuMuRC4XPuBbgqOA4VPkP2U-BzEMGYqp-wuotowf-pQmRcMx1djAnowP_7k7IdK6ph1GTsQuuNFjR1Zjjt2CHZc2JRD9iNxkP2DTg5t_Wgi3DmtTNrEQtiVwnkPTqptsWjBP-d2IVd1UgXOBiOJqX4eUBVf0pz_FgJjMyCMsMMOiZh0sv9gZgKepcK25MklR204XiLzzFmXeupH6tT1XtJMFRD')" }}></div>
                  <p className="text-xs text-on-surface-variant italic text-zinc-400">Fig 1.1: TAM expansion for Edge-AI inference (2024-2030)</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <h6 className="text-[10px] text-on-surface-variant uppercase mb-1">Growth Index</h6>
                    <p className="text-xl font-bold text-white">+184% YoY</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <h6 className="text-[10px] text-on-surface-variant uppercase mb-1">Founder Score</h6>
                    <p className="text-xl font-bold text-white">Top 1%</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h5 className="text-on-surface font-bold text-sm uppercase tracking-wider">Risk Assessment</h5>
                  <div className="flex items-center justify-between text-xs py-2 border-b border-white/10">
                    <span className="text-on-surface-variant text-zinc-400">Regulatory Headwinds</span>
                    <span className="text-error font-bold">Moderate</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-2">
                    <span className="text-on-surface-variant text-zinc-400">Execution Risk</span>
                    <span className="text-secondary font-bold">Low</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-white/10">
                <Link to="/login" className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">
                  <span className="material-symbols-outlined text-lg">download</span>
                  Export Institutional PDF
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VC Match Visualization */}
      <section className="py-32 bg-surface-container-low">
        <div className="max-w-container-max mx-auto px-margin-desktop text-center mb-16">
          <h2 className="font-display-md text-display-md mb-4 text-4xl font-extrabold text-white">Precision Investor Matching</h2>
          <p className="text-on-surface-variant max-w-2xl mx-auto text-zinc-400">
            Founders: Stop spraying and praying. VCs: Stop reviewing mismatched pitch decks.
          </p>
        </div>
        <div className="max-w-4xl mx-auto px-margin-desktop">
          <div className="space-y-4">
            {/* Match 1 */}
            <Link to="/login" className="flex items-center gap-6 p-6 glass-panel rounded-2xl hover:border-primary/40 transition-all cursor-pointer group block">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center font-bold text-xl text-white group-hover:scale-110 transition-transform">S</div>
              <div className="flex-1">
                <h4 className="font-bold text-lg text-white">Sequoia Capital</h4>
                <p className="text-sm text-on-surface-variant text-zinc-400 font-medium">Thesis: Core AI Infrastructure & Platforms</p>
              </div>
              <div className="text-right mr-4">
                <div className="text-primary font-bold text-xl">98% Match</div>
                <div className="text-[10px] uppercase text-on-surface-variant tracking-tighter">Confidence Score</div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </Link>
            {/* Match 2 */}
            <Link to="/login" className="flex items-center gap-6 p-6 glass-panel rounded-2xl hover:border-secondary/40 transition-all cursor-pointer group block">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center font-bold text-xl text-white group-hover:scale-110 transition-transform">A</div>
              <div className="flex-1">
                <h4 className="font-bold text-lg text-white">Andreessen Horowitz</h4>
                <p className="text-sm text-on-surface-variant text-zinc-400 font-medium">Thesis: AI Computing Efficiency & Scaling</p>
              </div>
              <div className="text-right mr-4">
                <div className="text-secondary font-bold text-xl">94% Match</div>
                <div className="text-[10px] uppercase text-on-surface-variant tracking-tighter">Confidence Score</div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </Link>
            {/* Match 3 */}
            <Link to="/login" className="flex items-center gap-6 p-6 glass-panel rounded-2xl hover:border-tertiary/40 transition-all cursor-pointer group block">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center font-bold text-xl text-white group-hover:scale-110 transition-transform">L</div>
              <div className="flex-1">
                <h4 className="font-bold text-lg text-white">Lux Capital</h4>
                <p className="text-sm text-on-surface-variant text-zinc-400 font-medium">Thesis: Deep Tech & Edge Computing Systems</p>
              </div>
              <div className="text-right mr-4">
                <div className="text-tertiary font-bold text-xl">89% Match</div>
                <div className="text-[10px] uppercase text-on-surface-variant tracking-tighter">Confidence Score</div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </Link>
          </div>
          <div className="mt-12 text-center">
            <p className="text-on-surface-variant text-sm mb-6 text-zinc-400">
              Generated by matching "Project Nebula" against 4,200 firm investment theses.
            </p>
            <Link to="/login" className="bg-white/10 text-on-surface px-8 py-3 rounded-full font-bold hover:bg-white/20 transition-all inline-block">
              Download Full Pipeline Report
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-32 bg-background">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="text-center mb-20">
            <h2 className="font-display-md text-display-md mb-4 text-4xl font-extrabold text-white">Investment-Grade Plans</h2>
            <p className="text-on-surface-variant text-zinc-400">Scale your intelligence as your AUM grows.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Starter */}
            <div className="glass-panel p-10 rounded-[2rem] border border-white/10 flex flex-col hover:scale-[1.02] transition-all">
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2 text-white">Starter</h3>
                <p className="text-on-surface-variant text-sm text-zinc-400">For emerging angels & solo scouts.</p>
              </div>
              <div className="mb-8">
                <span className="text-4xl font-bold text-white">$499</span>
                <span className="text-on-surface-variant">/mo</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1 text-zinc-300 text-sm">
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-primary text-lg">check</span> 5 Memos per month</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-primary text-lg">check</span> Basic founder signal tracking</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-primary text-lg">check</span> Web intelligence access</li>
                <li className="flex items-center gap-3 opacity-30"><span className="material-symbols-outlined text-lg">close</span> Custom model training</li>
              </ul>
              <Link to="/login" className="w-full py-4 border border-white/20 rounded-xl font-bold hover:bg-white/5 transition-all text-center block">
                Start Free Trial
              </Link>
            </div>
            {/* Pro */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-[2.1rem] blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative glass-panel p-10 rounded-[2rem] border border-primary/30 bg-primary/5 flex flex-col h-full transform scale-105 z-10">
                <div className="absolute top-6 right-6 bg-primary text-on-primary text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest">Most Popular</div>
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-2 text-white">Pro</h3>
                  <p className="text-on-surface-variant text-sm text-zinc-400">For active boutiques and seed funds.</p>
                </div>
                <div className="mb-8">
                  <span className="text-4xl font-bold text-white">$1,499</span>
                  <span className="text-on-surface-variant">/mo</span>
                </div>
                <ul className="space-y-4 mb-10 flex-1 text-zinc-200 text-sm">
                  <li className="flex items-center gap-3 font-bold"><span className="material-symbols-outlined text-primary text-lg">check</span> Unlimited memos</li>
                  <li className="flex items-center gap-3 font-bold"><span className="material-symbols-outlined text-primary text-lg">check</span> Real-time sentiment signals</li>
                  <li className="flex items-center gap-3 font-bold"><span className="material-symbols-outlined text-primary text-lg">check</span> LP report automation</li>
                  <li className="flex items-center gap-3 font-bold"><span className="material-symbols-outlined text-primary text-lg">check</span> VC matching engine</li>
                </ul>
                <Link to="/login" className="w-full py-4 bg-primary text-on-primary rounded-xl font-bold shadow-xl shadow-primary/30 transition-all hover:scale-95 active:scale-90 text-center block">
                  Get Pro Access
                </Link>
              </div>
            </div>
            {/* Enterprise */}
            <div className="glass-panel p-10 rounded-[2rem] border border-white/10 flex flex-col hover:scale-[1.02] transition-all">
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2 text-white">Enterprise</h3>
                <p className="text-on-surface-variant text-sm text-zinc-400">For global institutional firms.</p>
              </div>
              <div className="mb-8">
                <span className="text-4xl font-bold text-white">Custom</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1 text-zinc-300 text-sm">
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-primary text-lg">check</span> On-prem deployment option</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-primary text-lg">check</span> Dedicated data engineering</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-primary text-lg">check</span> Custom AI model fine-tuning</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-primary text-lg">check</span> 24/7 dedicated support</li>
              </ul>
              <Link to="/login" className="w-full py-4 border border-white/20 rounded-xl font-bold hover:bg-white/5 transition-all text-center block">
                Talk to Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-32 bg-surface-container-lowest">
        <div className="max-w-3xl mx-auto px-margin-desktop">
          <h2 className="font-display-md text-center text-display-md mb-16 text-4xl font-bold text-white">Questions?</h2>
          <div className="space-y-4">
            <details className="group glass-panel rounded-2xl border border-white/5 overflow-hidden open:border-primary/30 transition-all">
              <summary className="flex justify-between items-center p-6 cursor-pointer list-none text-white select-none">
                <span className="font-bold">How accurate is the AI in technical due diligence?</span>
                <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <div className="px-6 pb-6 text-on-surface-variant text-sm leading-relaxed text-zinc-400 border-t border-white/5 pt-4">
                Our technical agent specifically parses source code quality (if provided), patent filing technicalities, and developer community sentiment to provide a technical score that correlates 89% with subsequent institutional funding rounds.
              </div>
            </details>
            <details className="group glass-panel rounded-2xl border border-white/5 overflow-hidden open:border-primary/30 transition-all">
              <summary className="flex justify-between items-center p-6 cursor-pointer list-none text-white select-none">
                <span className="font-bold">Does this replace human junior analysts?</span>
                <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <div className="px-6 pb-6 text-on-surface-variant text-sm leading-relaxed text-zinc-400 border-t border-white/5 pt-4">
                It doesn't replace them—it gives them a 100x force multiplier. Analysts spend time on relationship building and high-level strategy while VC Scout handles the data extraction and synthesis.
              </div>
            </details>
            <details className="group glass-panel rounded-2xl border border-white/5 overflow-hidden open:border-primary/30 transition-all">
              <summary className="flex justify-between items-center p-6 cursor-pointer list-none text-white select-none">
                <span className="font-bold">Where does the data come from?</span>
                <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <div className="px-6 pb-6 text-on-surface-variant text-sm leading-relaxed text-zinc-400 border-t border-white/5 pt-4">
                We aggregate data from 200+ public and proprietary sources including GitHub, LinkedIn, Crunchbase, USPTO, and niche alternative data providers covering technical talent migration.
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-container-lowest border-t border-outline-variant w-full py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-margin-desktop max-w-container-max mx-auto">
          <div className="col-span-1 md:col-span-1">
            <div className="font-headline-lg text-headline-lg font-bold text-on-surface mb-6 text-2xl text-white">VC Scout</div>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-8 text-zinc-400 font-medium">
              Engineering the next generation of institutional intelligence for venture capital.
            </p>
            <div className="flex gap-4">
              <a className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary/20 transition-all text-on-surface-variant hover:text-primary" href="#">
                <span className="material-symbols-outlined">alternate_email</span>
              </a>
              <a className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary/20 transition-all text-on-surface-variant hover:text-primary" href="#">
                <span className="material-symbols-outlined">hub</span>
              </a>
            </div>
          </div>
          <div>
            <h6 className="font-bold mb-6 text-on-surface uppercase tracking-widest text-xs text-white">Platform</h6>
            <ul className="space-y-4 text-sm text-zinc-400 font-medium">
              <li><a className="hover:text-secondary transition-colors" href="#">Intelligence Engine</a></li>
              <li><a className="hover:text-secondary transition-colors" href="#">API Documentation</a></li>
              <li><a className="hover:text-secondary transition-colors" href="#">Security</a></li>
            </ul>
          </div>
          <div>
            <h6 className="font-bold mb-6 text-on-surface uppercase tracking-widest text-xs text-white">Company</h6>
            <ul className="space-y-4 text-sm text-zinc-400 font-medium">
              <li><a className="hover:text-secondary transition-colors" href="#">About Us</a></li>
              <li><a className="hover:text-secondary transition-colors" href="#">Careers</a></li>
              <li><a className="hover:text-secondary transition-colors" href="#">Newsroom</a></li>
            </ul>
          </div>
          <div>
            <h6 className="font-bold mb-6 text-on-surface uppercase tracking-widest text-xs text-white">Legal</h6>
            <ul className="space-y-4 text-sm text-zinc-400 font-medium">
              <li><a className="hover:text-secondary transition-colors" href="#">Privacy Policy</a></li>
              <li><a className="hover:text-secondary transition-colors" href="#">Terms of Service</a></li>
            </ul>
            <div className="mt-8">
              <p className="text-[10px] text-on-surface-variant text-zinc-500 font-medium">© 2024 VC Scout Intelligence. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
