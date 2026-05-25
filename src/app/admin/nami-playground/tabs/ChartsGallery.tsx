"use client";

import { useState } from "react";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, ZAxis, ComposedChart, Treemap, Funnel, FunnelChart, LabelList } from "recharts";
import { motion } from "framer-motion";
import { Play, Loader2, BarChart3, TrendingUp, PieChart as PieIcon, Radar as RadarIcon, Activity, Sparkles, Edit3, RotateCcw } from "lucide-react";
import { usePyodide } from "@/hooks/usePyodide";
import { CodeEditor } from "@/components/ui/CodeEditor";

const COLORS = ["#a855f7", "#ec4899", "#fbbf24", "#10b981", "#3b82f6", "#f97316", "#06b6d4", "#84cc16"];

// ─── Recharts 預設範例 ───
const RECHARTS_PRESETS = {
  line: {
    title: "📈 月增長線圖",
    icon: <TrendingUp size={14} />,
    data: Array.from({ length: 12 }, (_, i) => ({
      month: `${i + 1}月`,
      users: Math.round(100 + Math.sin(i / 2) * 50 + i * 15 + Math.random() * 30),
      xp: Math.round(500 + Math.cos(i / 2) * 200 + i * 80),
    })),
  },
  bar: {
    title: "📊 章節完成率",
    icon: <BarChart3 size={14} />,
    data: [
      { name: "Ch01", lessons: 18, completed: 14 },
      { name: "Ch08", lessons: 22, completed: 19 },
      { name: "Ch15", lessons: 16, completed: 12 },
      { name: "Ch22", lessons: 20, completed: 8 },
      { name: "Ch33", lessons: 14, completed: 3 },
    ],
  },
  pie: {
    title: "🥧 學員分布",
    icon: <PieIcon size={14} />,
    data: [
      { name: "前端", value: 35 },
      { name: "後端", value: 25 },
      { name: "AI", value: 20 },
      { name: "工具", value: 15 },
      { name: "其他", value: 5 },
    ],
  },
  radar: {
    title: "🎯 技能雷達圖",
    icon: <RadarIcon size={14} />,
    data: [
      { skill: "HTML", A: 90, B: 70 },
      { skill: "CSS", A: 85, B: 75 },
      { skill: "JS", A: 80, B: 85 },
      { skill: "React", A: 75, B: 90 },
      { skill: "Node", A: 65, B: 60 },
      { skill: "Python", A: 60, B: 95 },
    ],
  },
  scatter: {
    title: "💫 散點圖 (學習時數 vs 分數)",
    icon: <Activity size={14} />,
    data: Array.from({ length: 50 }, () => ({
      hours: Math.round(Math.random() * 40 + 5),
      score: Math.round(50 + Math.random() * 50),
    })),
  },
  treemap: {
    title: "🗺️ Treemap (學員分群佔比)",
    icon: <BarChart3 size={14} />,
    data: [
      { name: "新手 (Lv 1-5)", size: 4500, fill: "#a855f7" },
      { name: "中階 (Lv 6-15)", size: 2800, fill: "#ec4899" },
      { name: "進階 (Lv 16-30)", size: 1200, fill: "#fbbf24" },
      { name: "高手 (Lv 31+)", size: 350, fill: "#10b981" },
      { name: "流失 30d+", size: 1800, fill: "#6b7280" },
    ],
  },
  funnel: {
    title: "🪜 漏斗 (註冊 → 訂閱)",
    icon: <TrendingUp size={14} />,
    data: [
      { name: "造訪", value: 10000, fill: "#a855f7" },
      { name: "註冊", value: 1200, fill: "#ec4899" },
      { name: "首章完課", value: 680, fill: "#fbbf24" },
      { name: "Quiz 通過", value: 320, fill: "#10b981" },
      { name: "訂閱付費", value: 95, fill: "#3b82f6" },
    ],
  },
  area: {
    title: "🌊 累計面積圖",
    icon: <Activity size={14} />,
    data: Array.from({ length: 12 }, (_, i) => ({
      month: `${i + 1}月`,
      users: Math.round(100 + Math.sin(i / 2) * 50 + i * 15 + Math.random() * 30),
    })),
  },
};

export function ChartsGallery() {
  const [tab, setTab] = useState<"recharts" | "matplotlib">("recharts");
  return (
    <div className="space-y-4">
      <div className="flex gap-2 bg-bg-card border border-border rounded-xl p-1.5 w-fit">
        <button
          onClick={() => setTab("recharts")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${tab === "recharts" ? "bg-gradient-to-r from-purple-400 to-pink-400 text-black" : "text-fg-muted hover:text-fg"}`}
        >
          ⚛️ Recharts (React、8 種)
        </button>
        <button
          onClick={() => setTab("matplotlib")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${tab === "matplotlib" ? "bg-gradient-to-r from-purple-400 to-pink-400 text-black" : "text-fg-muted hover:text-fg"}`}
        >
          🐍 matplotlib (Pyodide、8 範例)
        </button>
      </div>

      {tab === "recharts" ? <RechartsView /> : <MatplotlibView />}
    </div>
  );
}

// ─── Recharts View — 8 種圖表 + 可改數據 ───
function RechartsView() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <EditableChart presetKey="line" />
      <EditableChart presetKey="bar" />
      <EditableChart presetKey="area" />
      <EditableChart presetKey="pie" />
      <EditableChart presetKey="scatter" />
      <EditableChart presetKey="funnel" />
      <EditableChart presetKey="treemap" wide />
      <EditableChart presetKey="radar" wide />
    </div>
  );
}

function EditableChart({ presetKey, wide }: { presetKey: keyof typeof RECHARTS_PRESETS; wide?: boolean }) {
  const preset = RECHARTS_PRESETS[presetKey];
  const [data, setData] = useState<any[]>(preset.data);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => JSON.stringify(preset.data, null, 2));
  const [err, setErr] = useState("");

  const apply = () => {
    try {
      const parsed = JSON.parse(draft);
      if (!Array.isArray(parsed)) throw new Error("要是 array");
      setData(parsed);
      setErr("");
      setEditing(false);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const reset = () => {
    setData(preset.data);
    setDraft(JSON.stringify(preset.data, null, 2));
    setErr("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      className={`bg-bg-card border border-border rounded-2xl p-4 hover:border-purple-500/40 transition ${wide ? "lg:col-span-2" : ""}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm inline-flex items-center gap-1.5 text-fg">
          <span className="text-purple-400">{preset.icon}</span>
          {preset.title}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditing(!editing)}
            className="p-1.5 rounded hover:bg-bg-elevated text-fg-muted hover:text-purple-300"
            title="改數據"
          >
            <Edit3 size={11} />
          </button>
          <button
            onClick={reset}
            className="p-1.5 rounded hover:bg-bg-elevated text-fg-muted hover:text-fg"
            title="還原"
          >
            <RotateCcw size={11} />
          </button>
        </div>
      </div>

      {editing && (
        <div className="mb-3 space-y-1.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            className="w-full bg-bg border border-border rounded-lg p-2 text-[11px] font-mono"
          />
          {err && <div className="text-[11px] text-red-400">⚠️ {err}</div>}
          <div className="flex items-center gap-2">
            <button onClick={apply} className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px]">套用</button>
            <button onClick={() => setEditing(false)} className="px-3 py-1 text-[11px] text-fg-muted hover:text-fg">取消</button>
            <span className="text-[10px] text-fg-muted/70">data 必須是 array、欄位名要對</span>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={260}>{renderChart(presetKey, data)}</ResponsiveContainer>
    </motion.div>
  );
}

function renderChart(key: string, data: any[]): React.ReactElement {
  const tooltip = <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />;
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />;

  if (key === "line") {
    return (
      <LineChart data={data}>
        {grid}
        <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} />
        <YAxis stroke="#9ca3af" fontSize={11} />
        {tooltip}
        <Legend />
        <Line type="monotone" dataKey="users" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} animationDuration={1500} />
        <Line type="monotone" dataKey="xp" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} animationDuration={1500} />
      </LineChart>
    );
  }
  if (key === "bar") {
    return (
      <BarChart data={data}>
        {grid}
        <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
        <YAxis stroke="#9ca3af" fontSize={11} />
        {tooltip}
        <Legend />
        <Bar dataKey="lessons" fill="#3b82f6" radius={[6, 6, 0, 0]} animationDuration={1500} />
        <Bar dataKey="completed" fill="#10b981" radius={[6, 6, 0, 0]} animationDuration={1500} />
      </BarChart>
    );
  }
  if (key === "area") {
    return (
      <AreaChart data={data}>
        <defs>
          <linearGradient id="grad-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.6} />
            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
          </linearGradient>
        </defs>
        {grid}
        <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} />
        <YAxis stroke="#9ca3af" fontSize={11} />
        {tooltip}
        <Area type="monotone" dataKey="users" stroke="#a855f7" fill="url(#grad-area)" strokeWidth={2} animationDuration={1500} />
      </AreaChart>
    );
  }
  if (key === "pie") {
    return (
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} animationDuration={1500} label={(p: any) => `${p.name} ${p.value}%`}>
          {data.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        {tooltip}
      </PieChart>
    );
  }
  if (key === "scatter") {
    return (
      <ScatterChart>
        {grid}
        <XAxis dataKey="hours" name="學習時數" stroke="#9ca3af" fontSize={11} unit="h" />
        <YAxis dataKey="score" name="分數" stroke="#9ca3af" fontSize={11} />
        <ZAxis range={[60, 200]} />
        {tooltip}
        <Scatter name="學員" data={data} fill="#ec4899" />
      </ScatterChart>
    );
  }
  if (key === "funnel") {
    return (
      <FunnelChart>
        {tooltip}
        <Funnel dataKey="value" data={data} isAnimationActive animationDuration={1500}>
          <LabelList position="inside" fill="#fff" stroke="none" dataKey="name" fontSize={12} fontWeight="bold" />
        </Funnel>
      </FunnelChart>
    );
  }
  if (key === "treemap") {
    return (
      <Treemap data={data} dataKey="size" stroke="#0f172a" fill="#8884d8" animationDuration={1500} />
    );
  }
  if (key === "radar") {
    return (
      <RadarChart data={data}>
        <PolarGrid stroke="#374151" />
        <PolarAngleAxis dataKey="skill" stroke="#9ca3af" fontSize={11} />
        <PolarRadiusAxis stroke="#374151" fontSize={9} />
        <Radar name="你" dataKey="A" stroke="#a855f7" fill="#a855f7" fillOpacity={0.4} animationDuration={1500} />
        <Radar name="平均" dataKey="B" stroke="#ec4899" fill="#ec4899" fillOpacity={0.3} animationDuration={1500} />
        <Legend />
        {tooltip}
      </RadarChart>
    );
  }
  return <div />;
}

// ─── Matplotlib View — 8 個範例 ───
const MATPLOTLIB_PRESETS: { name: string; desc: string; code: string }[] = [
  {
    name: "💫 散點圖",
    desc: "Scatter + colormap、200 點隨機分佈",
    code: `import micropip
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
ax.scatter(x, y, c=colors, s=sizes, alpha=0.7, cmap="plasma", edgecolors="white", linewidth=0.5)
ax.set_title("Random Scatter", color="white", fontsize=14)
ax.set_xlabel("x", color="#9ca3af")
ax.set_ylabel("y", color="#9ca3af")
ax.tick_params(colors="#9ca3af")
ax.grid(True, alpha=0.2, linestyle="--")
for s in ax.spines.values(): s.set_edgecolor("#374151")

buf = io.BytesIO()
plt.savefig(buf, format="png", dpi=100, bbox_inches="tight", facecolor="#0d1117")
print(f"__IMAGE__{base64.b64encode(buf.getvalue()).decode()}")
plt.close()`,
  },
  {
    name: "📊 直方圖",
    desc: "Histogram + KDE、看資料分佈",
    code: `import micropip
await micropip.install(["matplotlib", "numpy"])
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import io, base64

np.random.seed(7)
data1 = np.random.normal(70, 15, 1000)  # quiz 分數常態分佈
data2 = np.random.normal(85, 8, 800)    # 進階 user

fig, ax = plt.subplots(figsize=(7, 4.5), facecolor="#0d1117")
ax.set_facecolor("#0d1117")
ax.hist(data1, bins=40, alpha=0.6, color="#a855f7", label="一般學員", edgecolor="#0d1117")
ax.hist(data2, bins=40, alpha=0.6, color="#10b981", label="進階學員", edgecolor="#0d1117")
ax.axvline(np.mean(data1), color="#a855f7", linestyle="--", label=f"平均 {np.mean(data1):.1f}")
ax.axvline(np.mean(data2), color="#10b981", linestyle="--", label=f"平均 {np.mean(data2):.1f}")
ax.set_title("Quiz 分數分佈", color="white", fontsize=14)
ax.legend()
ax.tick_params(colors="#9ca3af")
for s in ax.spines.values(): s.set_edgecolor("#374151")

buf = io.BytesIO()
plt.savefig(buf, format="png", dpi=100, bbox_inches="tight", facecolor="#0d1117")
print(f"__IMAGE__{base64.b64encode(buf.getvalue()).decode()}")
plt.close()`,
  },
  {
    name: "🔥 熱圖 Heatmap",
    desc: "二維熱圖、顯示相關矩陣 / 時段流量",
    code: `import micropip
await micropip.install(["matplotlib", "numpy"])
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import io, base64

# 24h x 7d 流量熱圖
np.random.seed(42)
data = np.random.rand(7, 24) * 100
# 加 peak 模式 (晚上 8-10pm 高、週末更高)
for d in range(7):
    for h in range(24):
        if 19 <= h <= 22:
            data[d, h] *= 1.5 if d < 5 else 2.5
        if h < 6:
            data[d, h] *= 0.3

fig, ax = plt.subplots(figsize=(8, 4), facecolor="#0d1117")
ax.set_facecolor("#0d1117")
im = ax.imshow(data, cmap="plasma", aspect="auto")
ax.set_xticks(range(24))
ax.set_xticklabels([f"{h}h" for h in range(24)], fontsize=8)
ax.set_yticks(range(7))
ax.set_yticklabels(["週一", "週二", "週三", "週四", "週五", "週六", "週日"])
ax.set_title("週流量熱圖 (24h × 7d)", color="white", fontsize=14)
ax.tick_params(colors="#9ca3af")
cbar = plt.colorbar(im, ax=ax)
cbar.ax.tick_params(colors="#9ca3af")

buf = io.BytesIO()
plt.savefig(buf, format="png", dpi=100, bbox_inches="tight", facecolor="#0d1117")
print(f"__IMAGE__{base64.b64encode(buf.getvalue()).decode()}")
plt.close()`,
  },
  {
    name: "🎯 Boxplot 箱型圖",
    desc: "分組統計、看分佈差異",
    code: `import micropip
await micropip.install(["matplotlib", "numpy"])
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import io, base64

np.random.seed(42)
groups = {
    "新手 Lv 1-5": np.random.normal(60, 12, 200),
    "中階 Lv 6-15": np.random.normal(72, 10, 200),
    "進階 Lv 16-30": np.random.normal(82, 8, 200),
    "高手 Lv 31+": np.random.normal(90, 5, 200),
}

fig, ax = plt.subplots(figsize=(8, 4.5), facecolor="#0d1117")
ax.set_facecolor("#0d1117")
bp = ax.boxplot(list(groups.values()), labels=list(groups.keys()), patch_artist=True, widths=0.6)
COLORS = ["#a855f7", "#ec4899", "#fbbf24", "#10b981"]
for patch, c in zip(bp["boxes"], COLORS):
    patch.set_facecolor(c)
    patch.set_alpha(0.6)
    patch.set_edgecolor(c)
for m in bp["medians"]: m.set_color("white")
ax.set_title("各等級 quiz 分數箱型圖", color="white", fontsize=14)
ax.tick_params(colors="#9ca3af")
ax.grid(True, alpha=0.2, linestyle="--", axis="y")
for s in ax.spines.values(): s.set_edgecolor("#374151")

buf = io.BytesIO()
plt.savefig(buf, format="png", dpi=100, bbox_inches="tight", facecolor="#0d1117")
print(f"__IMAGE__{base64.b64encode(buf.getvalue()).decode()}")
plt.close()`,
  },
  {
    name: "📈 多子圖 Subplots",
    desc: "2x2 dashboard、4 個視角一頁看",
    code: `import micropip
await micropip.install(["matplotlib", "numpy"])
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import io, base64

np.random.seed(42)
months = ["1月", "2月", "3月", "4月", "5月", "6月"]
revenue = [12, 18, 25, 22, 35, 42]
users = [120, 180, 240, 290, 380, 450]

fig, axes = plt.subplots(2, 2, figsize=(10, 6), facecolor="#0d1117")
fig.suptitle("AI 島 6 月運營 Dashboard", color="white", fontsize=14)

for ax in axes.flat:
    ax.set_facecolor("#0d1117")
    ax.tick_params(colors="#9ca3af")
    for s in ax.spines.values(): s.set_edgecolor("#374151")

axes[0,0].plot(months, revenue, color="#fbbf24", marker="o", linewidth=2)
axes[0,0].set_title("月營收 (萬)", color="white")
axes[0,0].fill_between(range(len(months)), revenue, alpha=0.2, color="#fbbf24")

axes[0,1].bar(months, users, color="#a855f7", alpha=0.8)
axes[0,1].set_title("新註冊", color="white")

axes[1,0].pie([35, 25, 20, 15, 5], labels=["前端", "後端", "AI", "工具", "其他"], colors=["#a855f7","#ec4899","#fbbf24","#10b981","#3b82f6"], autopct="%1.0f%%", textprops={"color":"white"})
axes[1,0].set_title("興趣分群", color="white")

axes[1,1].scatter(np.random.rand(100) * 40, np.random.rand(100) * 100, alpha=0.5, c="#10b981", s=30)
axes[1,1].set_title("學習時數 vs 分數", color="white")

plt.tight_layout()
buf = io.BytesIO()
plt.savefig(buf, format="png", dpi=100, bbox_inches="tight", facecolor="#0d1117")
print(f"__IMAGE__{base64.b64encode(buf.getvalue()).decode()}")
plt.close()`,
  },
  {
    name: "🌐 3D 表面圖",
    desc: "matplotlib mplot3d、地形 / 損失函數",
    code: `import micropip
await micropip.install(["matplotlib", "numpy"])
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import numpy as np
import io, base64

X = np.arange(-5, 5, 0.25)
Y = np.arange(-5, 5, 0.25)
X, Y = np.meshgrid(X, Y)
Z = np.sin(np.sqrt(X**2 + Y**2))

fig = plt.figure(figsize=(8, 6), facecolor="#0d1117")
ax = fig.add_subplot(111, projection="3d")
ax.set_facecolor("#0d1117")
surf = ax.plot_surface(X, Y, Z, cmap="viridis", alpha=0.9, edgecolor="none")
ax.set_title("3D 表面圖 — sin(√(x²+y²))", color="white", fontsize=14)
ax.tick_params(colors="#9ca3af")
fig.colorbar(surf, shrink=0.6, aspect=15).ax.tick_params(colors="#9ca3af")

buf = io.BytesIO()
plt.savefig(buf, format="png", dpi=100, bbox_inches="tight", facecolor="#0d1117")
print(f"__IMAGE__{base64.b64encode(buf.getvalue()).decode()}")
plt.close()`,
  },
  {
    name: "📉 時間序列",
    desc: "股價 / 用戶活躍、含移動平均",
    code: `import micropip
await micropip.install(["matplotlib", "numpy", "pandas"])
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import io, base64

np.random.seed(42)
days = pd.date_range("2026-01-01", periods=180, freq="D")
returns = np.random.randn(180) * 0.02
price = 100 * (1 + returns).cumprod()
ma20 = pd.Series(price).rolling(20).mean()
ma60 = pd.Series(price).rolling(60).mean()

fig, ax = plt.subplots(figsize=(10, 4.5), facecolor="#0d1117")
ax.set_facecolor("#0d1117")
ax.plot(days, price, color="#a855f7", linewidth=1.2, label="收盤價")
ax.plot(days, ma20, color="#fbbf24", linewidth=1.5, linestyle="--", label="MA20")
ax.plot(days, ma60, color="#10b981", linewidth=1.5, linestyle="--", label="MA60")
ax.fill_between(days, price, alpha=0.1, color="#a855f7")
ax.set_title("模擬股價時間序列 + 移動平均", color="white", fontsize=14)
ax.legend(loc="upper left")
ax.tick_params(colors="#9ca3af")
ax.grid(True, alpha=0.2, linestyle="--")
for s in ax.spines.values(): s.set_edgecolor("#374151")
plt.xticks(rotation=30)

buf = io.BytesIO()
plt.savefig(buf, format="png", dpi=100, bbox_inches="tight", facecolor="#0d1117")
print(f"__IMAGE__{base64.b64encode(buf.getvalue()).decode()}")
plt.close()`,
  },
  {
    name: "🌈 Violin Plot",
    desc: "比 boxplot 更細的分佈圖",
    code: `import micropip
await micropip.install(["matplotlib", "numpy"])
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import io, base64

np.random.seed(42)
data = [
    np.random.normal(60, 8, 200),
    np.random.normal(72, 10, 200),
    np.random.normal(82, 6, 200),
    np.random.exponential(15, 200) + 50,  # 偏態
]

fig, ax = plt.subplots(figsize=(8, 4.5), facecolor="#0d1117")
ax.set_facecolor("#0d1117")
parts = ax.violinplot(data, showmeans=True, showmedians=False, widths=0.7)
for pc, c in zip(parts["bodies"], ["#a855f7","#ec4899","#fbbf24","#10b981"]):
    pc.set_facecolor(c)
    pc.set_alpha(0.6)
    pc.set_edgecolor(c)
ax.set_xticks([1,2,3,4])
ax.set_xticklabels(["Group A", "Group B", "Group C", "Group D (偏態)"])
ax.set_title("Violin Plot — 看完整分佈不只 quartile", color="white", fontsize=14)
ax.tick_params(colors="#9ca3af")
ax.grid(True, alpha=0.2, linestyle="--", axis="y")
for s in ax.spines.values(): s.set_edgecolor("#374151")

buf = io.BytesIO()
plt.savefig(buf, format="png", dpi=100, bbox_inches="tight", facecolor="#0d1117")
print(f"__IMAGE__{base64.b64encode(buf.getvalue()).decode()}")
plt.close()`,
  },
];

function MatplotlibView() {
  const { status, progress, error, load, run } = usePyodide();
  const [running, setRunning] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [stderr, setStderr] = useState("");
  const [presetIdx, setPresetIdx] = useState(0);
  const preset = MATPLOTLIB_PRESETS[presetIdx];
  const [code, setCode] = useState(preset.code);

  const pickPreset = (i: number) => {
    setPresetIdx(i);
    setCode(MATPLOTLIB_PRESETS[i].code);
    setImageData(null);
    setStderr("");
  };

  const execute = async () => {
    if (running) return;
    setRunning(true);
    setImageData(null);
    setStderr("");
    const r = await run(code);
    const m = r.stdout.match(/__IMAGE__([A-Za-z0-9+/=]+)/);
    if (m) setImageData(`data:image/png;base64,${m[1]}`);
    else if (r.images?.length > 0) setImageData(`data:image/png;base64,${r.images[0]}`);
    if (r.stderr) setStderr(r.stderr);
    setRunning(false);
  };

  return (
    <div className="space-y-3">
      {/* Preset picker */}
      <div className="bg-bg-card border border-border rounded-2xl p-3">
        <div className="text-[10px] uppercase tracking-wider text-fg-muted mb-2 font-bold">📚 範例 (點切換)</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {MATPLOTLIB_PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => pickPreset(i)}
              className={`text-left p-2 rounded-xl border transition ${
                i === presetIdx
                  ? "border-purple-400 bg-purple-500/10"
                  : "border-border hover:border-purple-400/50 hover:bg-bg-elevated"
              }`}
            >
              <div className="font-bold text-xs">{p.name}</div>
              <div className="text-[10px] text-fg-muted line-clamp-1 mt-0.5">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div>
          {status === "idle" && (
            <button onClick={load} className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">載入 Python</button>
          )}
          {status === "loading" && <span className="text-fg-muted inline-flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> {progress}</span>}
          {status === "ready" && <span className="text-emerald-400">● Python ready (matplotlib 已預載)</span>}
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
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">
            📝 {preset.name} code (隨意改、再「畫圖」)
          </div>
          <CodeEditor value={code} onChange={setCode} onRun={execute} lang="python" storageKey={`matplotlib-${presetIdx}`} height="420px" minHeight="420px" />
        </div>
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">🖼️ 圖表輸出</div>
          <div className="min-h-[420px] flex items-center justify-center p-3 bg-[#0d1117]">
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
