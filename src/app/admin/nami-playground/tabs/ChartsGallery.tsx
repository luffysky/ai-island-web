"use client";

import { useState } from "react";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { motion } from "framer-motion";
import { Play, Loader2, BarChart3, TrendingUp, PieChart as PieIcon, Radar as RadarIcon, Activity, Sparkles } from "lucide-react";
import { usePyodide } from "@/hooks/usePyodide";

const COLORS = ["#a855f7", "#ec4899", "#fbbf24", "#10b981", "#3b82f6", "#f97316", "#06b6d4"];

const SAMPLE_LINE = Array.from({ length: 12 }, (_, i) => ({
  month: `${i + 1}月`,
  users: Math.round(100 + Math.sin(i / 2) * 50 + i * 15 + Math.random() * 30),
  xp: Math.round(500 + Math.cos(i / 2) * 200 + i * 80),
}));

const SAMPLE_BAR = [
  { name: "Ch01", lessons: 18, completed: 14 },
  { name: "Ch08", lessons: 22, completed: 19 },
  { name: "Ch15", lessons: 16, completed: 12 },
  { name: "Ch22", lessons: 20, completed: 8 },
  { name: "Ch33", lessons: 14, completed: 3 },
];

const SAMPLE_PIE = [
  { name: "前端", value: 35 },
  { name: "後端", value: 25 },
  { name: "AI", value: 20 },
  { name: "工具", value: 15 },
  { name: "其他", value: 5 },
];

const SAMPLE_RADAR = [
  { skill: "HTML", A: 90, B: 70 },
  { skill: "CSS", A: 85, B: 75 },
  { skill: "JS", A: 80, B: 85 },
  { skill: "React", A: 75, B: 90 },
  { skill: "Node", A: 65, B: 60 },
  { skill: "Python", A: 60, B: 95 },
];

export function ChartsGallery() {
  const [tab, setTab] = useState<"recharts" | "matplotlib">("recharts");
  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 bg-bg-card border border-border rounded-xl p-1.5 w-fit">
        <button
          onClick={() => setTab("recharts")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${tab === "recharts" ? "bg-gradient-to-r from-purple-400 to-pink-400 text-black" : "text-fg-muted hover:text-fg"}`}
        >
          ⚛️ Recharts (React)
        </button>
        <button
          onClick={() => setTab("matplotlib")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${tab === "matplotlib" ? "bg-gradient-to-r from-purple-400 to-pink-400 text-black" : "text-fg-muted hover:text-fg"}`}
        >
          🐍 matplotlib (Pyodide)
        </button>
      </div>

      {tab === "recharts" ? <RechartsView /> : <MatplotlibView />}
    </div>
  );
}

function RechartsView() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <ChartCard title="📈 月增長線圖" icon={<TrendingUp size={14} />}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={SAMPLE_LINE}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} />
            <YAxis stroke="#9ca3af" fontSize={11} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
            <Legend />
            <Line type="monotone" dataKey="users" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} animationDuration={1500} />
            <Line type="monotone" dataKey="xp" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} animationDuration={1500} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="📊 章節完成率" icon={<BarChart3 size={14} />}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={SAMPLE_BAR}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
            <YAxis stroke="#9ca3af" fontSize={11} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
            <Legend />
            <Bar dataKey="lessons" fill="#3b82f6" radius={[6, 6, 0, 0]} animationDuration={1500} />
            <Bar dataKey="completed" fill="#10b981" radius={[6, 6, 0, 0]} animationDuration={1500} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="🌊 累計面積圖" icon={<Activity size={14} />}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={SAMPLE_LINE}>
            <defs>
              <linearGradient id="grad-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} />
            <YAxis stroke="#9ca3af" fontSize={11} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
            <Area type="monotone" dataKey="users" stroke="#a855f7" fill="url(#grad-area)" strokeWidth={2} animationDuration={1500} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="🥧 學員分布" icon={<PieIcon size={14} />}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={SAMPLE_PIE} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} animationDuration={1500} label={(p: any) => `${p.name} ${p.value}%`}>
              {SAMPLE_PIE.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="🎯 技能雷達圖" icon={<RadarIcon size={14} />} wide>
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={SAMPLE_RADAR}>
            <PolarGrid stroke="#374151" />
            <PolarAngleAxis dataKey="skill" stroke="#9ca3af" fontSize={11} />
            <PolarRadiusAxis stroke="#374151" fontSize={9} />
            <Radar name="你" dataKey="A" stroke="#a855f7" fill="#a855f7" fillOpacity={0.4} animationDuration={1500} />
            <Radar name="平均" dataKey="B" stroke="#ec4899" fill="#ec4899" fillOpacity={0.3} animationDuration={1500} />
            <Legend />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
          </RadarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, icon, wide, children }: { title: string; icon: React.ReactNode; wide?: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      className={`bg-bg-card border border-border rounded-2xl p-4 hover:border-purple-500/40 transition ${wide ? "lg:col-span-2" : ""}`}
    >
      <h3 className="font-bold text-sm mb-3 inline-flex items-center gap-1.5 text-fg">
        <span className="text-purple-400">{icon}</span>
        {title}
      </h3>
      {children}
    </motion.div>
  );
}

function MatplotlibView() {
  const { status, progress, error, load, run } = usePyodide();
  const [running, setRunning] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [stderr, setStderr] = useState("");

  const MATPLOTLIB_DEMO = `# 用 matplotlib 畫一張多色散點圖
import micropip
await micropip.install(["matplotlib", "numpy"])
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import io, base64

np.random.seed(42)
n = 200
x = np.random.randn(n)
y = x * 0.8 + np.random.randn(n) * 0.5
colors = np.random.rand(n)
sizes = np.random.rand(n) * 200 + 20

fig, ax = plt.subplots(figsize=(7, 4.5), facecolor="#0d1117")
ax.set_facecolor("#0d1117")
scatter = ax.scatter(x, y, c=colors, s=sizes, alpha=0.7, cmap="plasma", edgecolors="white", linewidth=0.5)
ax.set_title("Random Scatter (Nami's lab)", color="white", fontsize=14)
ax.set_xlabel("x", color="#9ca3af")
ax.set_ylabel("y", color="#9ca3af")
ax.tick_params(colors="#9ca3af")
ax.grid(True, alpha=0.2, linestyle="--")
for spine in ax.spines.values():
    spine.set_edgecolor("#374151")

buf = io.BytesIO()
plt.savefig(buf, format="png", dpi=100, bbox_inches="tight", facecolor="#0d1117")
buf.seek(0)
b64 = base64.b64encode(buf.read()).decode()
print(f"__IMAGE__{b64}")
plt.close()
`;

  const [code, setCode] = useState(MATPLOTLIB_DEMO);

  const execute = async () => {
    if (running) return;
    setRunning(true);
    setImageData(null);
    setStderr("");
    const r = await run(code);
    const m = r.stdout.match(/__IMAGE__([A-Za-z0-9+/=]+)/);
    if (m) setImageData(`data:image/png;base64,${m[1]}`);
    if (r.stderr) setStderr(r.stderr);
    setRunning(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div>
          {status === "idle" && (
            <button onClick={load} className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">載入 Python</button>
          )}
          {status === "loading" && <span className="text-fg-muted inline-flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> {progress}</span>}
          {status === "ready" && <span className="text-emerald-400">● Python ready</span>}
          {status === "error" && <span className="text-red-400">⚠️ {error}</span>}
        </div>
        <button
          onClick={execute}
          disabled={running || status !== "ready"}
          className="px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold text-xs inline-flex items-center gap-1 disabled:opacity-50"
        >
          {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
          畫圖
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">📝 matplotlib code</div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="w-full bg-[#0d1117] text-[#e6edf3] font-mono text-xs p-3 outline-none border-0 resize-y min-h-[380px] leading-relaxed"
          />
        </div>
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">🖼️ 圖表輸出</div>
          <div className="min-h-[380px] flex items-center justify-center p-3 bg-[#0d1117]">
            {imageData ? (
              <img src={imageData} alt="matplotlib output" className="max-w-full rounded" />
            ) : stderr ? (
              <pre className="text-red-400 text-xs whitespace-pre-wrap">{stderr}</pre>
            ) : (
              <div className="text-fg-muted/60 text-xs inline-flex items-center gap-1">
                <Sparkles size={12} /> 跑 matplotlib 後圖會出現在這
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
