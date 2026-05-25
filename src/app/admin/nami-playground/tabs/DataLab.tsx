"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Loader2, Database, FileText, TrendingUp, BarChart3, Brain, Download } from "lucide-react";
import { usePyodide } from "@/hooks/usePyodide";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { AskAI } from "@/components/nami/AskAI";

const EXERCISES = [
  {
    name: "📊 銷售數據分析（pandas）",
    desc: "業界最常見：clean / aggregate / groupby / pivot",
    icon: BarChart3,
    code: `# 業界題型：分析模擬電商 1 年訂單、找 top 客戶 / 月成長 / 客單價
import micropip
await micropip.install(["pandas"])
import pandas as pd
import random
from datetime import datetime, timedelta

# 生 365 天、每天 50~200 筆訂單
random.seed(42)
rows = []
products = ["iPhone", "iPad", "AirPods", "MacBook", "Watch"]
for d in range(365):
    date = datetime(2026, 1, 1) + timedelta(days=d)
    n = random.randint(50, 200)
    for _ in range(n):
        rows.append({
            "date": date,
            "customer_id": f"u{random.randint(1, 1000):04d}",
            "product": random.choice(products),
            "qty": random.randint(1, 3),
            "price": random.choice([29900, 8990, 5990, 39900, 12900]),
        })

df = pd.DataFrame(rows)
df["revenue"] = df["qty"] * df["price"]
print(f"訂單總筆數：{len(df):,}")
print(f"總營收：NT$ {df['revenue'].sum():,}")
print(f"\\n— Top 5 客戶（依消費金額）—")
top_customers = df.groupby("customer_id")["revenue"].sum().nlargest(5)
print(top_customers)

print(f"\\n— 月營收趨勢 —")
df["month"] = df["date"].dt.to_period("M")
monthly = df.groupby("month")["revenue"].agg(["sum", "count"])
monthly.columns = ["營收", "訂單數"]
print(monthly)

print(f"\\n— 各產品營收佔比 —")
by_product = df.groupby("product")["revenue"].sum().sort_values(ascending=False)
total = by_product.sum()
for p, r in by_product.items():
    print(f"  {p:<10} NT$ {r:>13,}  ({r/total*100:5.1f}%)")
`,
  },
  {
    name: "📈 時間序列分析（股價 / 流量）",
    desc: "業界題型：移動平均、波動率、相關性",
    icon: TrendingUp,
    code: `# 業界題型：分析模擬股價、算 MA20 / 波動率 / 最大回撤
import micropip
await micropip.install(["pandas", "numpy"])
import pandas as pd
import numpy as np

# 生 1 年股價（基底 100 + brownian motion）
np.random.seed(7)
n_days = 252  # 一年交易日
returns = np.random.randn(n_days) * 0.02  # 日報酬 ~N(0, 2%)
price = 100 * (1 + returns).cumprod()
dates = pd.date_range("2026-01-01", periods=n_days, freq="B")
df = pd.DataFrame({"close": price}, index=dates)

# 1. 移動平均
df["MA5"] = df["close"].rolling(5).mean()
df["MA20"] = df["close"].rolling(20).mean()
df["MA60"] = df["close"].rolling(60).mean()

# 2. 日報酬 + 波動率（年化）
df["daily_return"] = df["close"].pct_change()
annualized_vol = df["daily_return"].std() * np.sqrt(252) * 100

# 3. 最大回撤
df["peak"] = df["close"].cummax()
df["drawdown"] = (df["close"] - df["peak"]) / df["peak"] * 100
max_dd = df["drawdown"].min()
max_dd_date = df["drawdown"].idxmin()

# 4. 黃金交叉 / 死亡交叉
df["cross"] = (df["MA5"] > df["MA20"]) & (df["MA5"].shift() <= df["MA20"].shift())
golden_crosses = df[df["cross"]].index

print(f"年化波動率：{annualized_vol:.2f}%")
print(f"最大回撤：{max_dd:.2f}% (於 {max_dd_date.date()})")
print(f"\\n黃金交叉日期（MA5 上穿 MA20）：")
for d in golden_crosses[:5]:
    print(f"  {d.date()}  收盤 {df.loc[d,'close']:.2f}")

print(f"\\n— 最後 5 天 —")
print(df.tail()[["close", "MA5", "MA20", "MA60"]].round(2))
`,
  },
  {
    name: "🎯 客戶分群 K-Means",
    desc: "業界題型：RFM 分析、無監督分群",
    icon: Brain,
    code: `# 業界題型：用 K-Means 把客戶分 4 群、找超級客 / 流失預警
import micropip
await micropip.install(["pandas", "numpy", "scikit-learn"])
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

# 生 500 個客戶的 RFM 資料
# R = recency (最近一次購買距今天數)
# F = frequency (一年內購買次數)
# M = monetary (一年總消費)
np.random.seed(42)
n = 500
df = pd.DataFrame({
    "customer_id": [f"u{i:04d}" for i in range(n)],
    "recency_days":  np.abs(np.random.exponential(60, n)).astype(int),
    "frequency":     np.random.poisson(5, n),
    "monetary":      np.random.lognormal(7, 1, n).round(0),
})

# 標準化 + K-Means 4 群
X = StandardScaler().fit_transform(df[["recency_days", "frequency", "monetary"]])
km = KMeans(n_clusters=4, random_state=42, n_init=10)
df["cluster"] = km.fit_predict(X)

# 每群的平均 RFM
summary = df.groupby("cluster").agg(
    人數=("customer_id", "count"),
    平均距今天數=("recency_days", "mean"),
    平均購買次數=("frequency", "mean"),
    平均消費=("monetary", "mean"),
).round(1)

# 自動標 segment
def label(row):
    if row["平均距今天數"] < 30 and row["平均消費"] > 2000:
        return "🌟 超級客戶"
    if row["平均距今天數"] < 60 and row["平均購買次數"] >= 5:
        return "💎 常客"
    if row["平均距今天數"] > 120:
        return "⚠️ 流失預警"
    return "👋 一般客"

summary["分群標籤"] = summary.apply(label, axis=1)
print("=== K-Means 客戶分群結果 ===\\n")
print(summary)
print(f"\\n— 流失預警客戶範例 —")
churn = df[df["recency_days"] > 120].head(10)
print(churn[["customer_id", "recency_days", "frequency", "monetary"]])
`,
  },
  {
    name: "📰 文字處理 + 詞頻分析",
    desc: "業界題型：NLP 基礎、輿情分析、TF-IDF",
    icon: FileText,
    code: `# 業界題型：分析一批產品評論、找高頻詞 + 情感傾向
import micropip
await micropip.install(["pandas"])
import pandas as pd
import re
from collections import Counter

# 模擬 50 則產品評論
reviews = [
    "這手機超讚！速度快、相機清晰、續航力很好",
    "完全失望、開箱就壞了、客服超爛",
    "價格貴但品質確實好、值得入手",
    "設計漂亮、使用流暢、推薦購買",
    "故障率高、修了三次、再也不買了",
    "用了三個月、很滿意、推薦給朋友",
    "電池退化快、不到一年就需要換",
    "拍照效果驚艷、夜拍尤其好",
    "客服回應慢、處理態度也不好",
    "整體不錯、CP 值高、會考慮再買",
    "螢幕色準很差、看起來偏黃",
    "充電速度超快、半小時就滿",
    "重量輕、攜帶方便、適合女生用",
    "系統常當機、體驗很糟",
    "聲音清晰、通話品質好",
    "包裝精美、開箱有質感",
    "比預期慢、效能不如廣告",
    "和官網描述一致、滿意",
    "做工粗糙、邊邊有毛邊",
    "顏色比實品偏暗、有點失望",
] * 3  # 60 則

# 1. 正面 / 負面詞典
pos_words = {"讚", "好", "快", "推薦", "滿意", "清晰", "漂亮", "流暢", "驚艷", "輕", "值得", "精美"}
neg_words = {"失望", "壞", "爛", "慢", "故障", "糟", "粗糙", "差", "退化"}

def score(text):
    p = sum(1 for w in pos_words if w in text)
    n = sum(1 for w in neg_words if w in text)
    return p - n

df = pd.DataFrame({"review": reviews})
df["sentiment"] = df["review"].apply(score)
df["category"] = df["sentiment"].apply(lambda s: "正面" if s > 0 else ("負面" if s < 0 else "中性"))

print("=== 評論情感分布 ===")
print(df["category"].value_counts())
print()

# 2. 高頻關鍵詞（2-char ngram）
def ngrams(text, n=2):
    text = re.sub(r"[，。、！？]", " ", text)
    text = text.replace(" ", "")
    return [text[i:i+n] for i in range(len(text) - n + 1)]

all_grams = []
for r in reviews:
    all_grams.extend(ngrams(r))

# 過濾無意義組合
stop = {"這個", "他們", "我們", "就是", "可以", "已經", "因為", "所以", "但是"}
counter = Counter(g for g in all_grams if g not in stop and len(g) == 2)

print("=== 高頻 2-字詞 top 15 ===")
for word, count in counter.most_common(15):
    print(f"  {word}  {count} 次")
`,
  },
  {
    name: "🌐 真實 API → 數據面板",
    desc: "業界題型：API → DataFrame → 分析",
    icon: Database,
    code: `# 業界完整流程：抓 GitHub API → 整成 DataFrame → 分析語言分布
import micropip
await micropip.install(["pandas"])
import pandas as pd
import json
from js import fetch, encodeURIComponent

# 抓某個熱門 user 的 repo
url = "https://api.github.com/users/vercel/repos?per_page=100&sort=updated"
resp = await fetch("/api/admin/playground/scrape?url=" + encodeURIComponent(url))
data = (await resp.json()).to_py()
repos = json.loads(data["body"])

df = pd.DataFrame([{
    "name": r["name"],
    "language": r.get("language") or "Unknown",
    "stars": r.get("stargazers_count", 0),
    "forks": r.get("forks_count", 0),
    "open_issues": r.get("open_issues_count", 0),
    "size_kb": r.get("size", 0),
    "is_fork": r.get("fork", False),
    "updated": r.get("updated_at", "")[:10],
} for r in repos])

print(f"分析 vercel 在 GitHub 的 {len(df)} 個 repo：\\n")

# 1. 語言分布
print("— 主要語言 —")
print(df.groupby("language")["stars"].agg(["count", "sum"]).sort_values("sum", ascending=False).head(8))

# 2. star top 10
print("\\n— star 最多的 10 個 repo —")
top = df.nlargest(10, "stars")[["name", "language", "stars", "forks"]]
print(top.to_string(index=False))

# 3. 平均 star 最高的語言
print("\\n— 平均 star 最高的語言 (≥3 個 repo) —")
lang_avg = df.groupby("language").agg(repo_count=("name", "count"), avg_stars=("stars", "mean")).round(0)
lang_avg = lang_avg[lang_avg["repo_count"] >= 3].sort_values("avg_stars", ascending=False)
print(lang_avg)
`,
  },
  {
    name: "📐 統計分布視覺化",
    desc: "業界題型：直方圖、Q-Q plot、相關係數",
    icon: BarChart3,
    code: `# 業界題型：拿一批數據、做完整統計描述 + 視覺化
import micropip
await micropip.install(["pandas", "numpy", "matplotlib"])
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import io, base64

# 生 1000 個學員的學習資料
np.random.seed(42)
n = 1000
df = pd.DataFrame({
    "hours_studied": np.random.gamma(3, 5, n).round(1),  # gamma 分布
    "lessons_done":  np.random.poisson(15, n),
    "quiz_score":    np.clip(np.random.normal(70, 15, n), 0, 100).round(0),
    "satisfaction":  np.random.choice([1, 2, 3, 4, 5], n, p=[0.05, 0.1, 0.2, 0.4, 0.25]),
})

# 統計描述
print("=== 描述統計 ===")
print(df.describe().round(2))

# 相關矩陣
print("\\n=== 相關係數 ===")
print(df.corr().round(3))

# 畫 4 張子圖
fig, axes = plt.subplots(2, 2, figsize=(11, 7), facecolor="#0d1117")
fig.suptitle("學員學習行為分布", color="white", fontsize=14)

for ax in axes.flat:
    ax.set_facecolor("#0d1117")
    ax.tick_params(colors="#9ca3af")
    for s in ax.spines.values(): s.set_edgecolor("#374151")

axes[0, 0].hist(df["hours_studied"], bins=30, color="#a855f7", edgecolor="#0d1117")
axes[0, 0].set_title("學習時數 (Gamma 分布)", color="white")

axes[0, 1].hist(df["quiz_score"], bins=30, color="#ec4899", edgecolor="#0d1117")
axes[0, 1].set_title("Quiz 分數 (常態)", color="white")

axes[1, 0].scatter(df["hours_studied"], df["quiz_score"], alpha=0.3, c="#06b6d4", s=10)
axes[1, 0].set_title("學習時數 vs Quiz 分數", color="white")
axes[1, 0].set_xlabel("hours", color="#9ca3af")
axes[1, 0].set_ylabel("score", color="#9ca3af")

sats = df["satisfaction"].value_counts().sort_index()
axes[1, 1].bar(sats.index, sats.values, color="#10b981", edgecolor="#0d1117")
axes[1, 1].set_title("滿意度分布 (1-5)", color="white")

plt.tight_layout()
buf = io.BytesIO()
plt.savefig(buf, format="png", dpi=100, bbox_inches="tight", facecolor="#0d1117")
b64 = base64.b64encode(buf.getvalue()).decode()
print(f"\\n__IMAGE__{b64}")
plt.close()
`,
  },
];

export function DataLab() {
  const { status, progress, error, load, run } = usePyodide();
  const [selected, setSelected] = useState(EXERCISES[0]);
  const [code, setCode] = useState(EXERCISES[0].code);
  const [output, setOutput] = useState<string>("");
  const [stderr, setStderr] = useState<string>("");
  const [images, setImages] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const outputRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
  }, [output]);

  const pick = (ex: typeof EXERCISES[number]) => {
    setSelected(ex);
    setCode(ex.code);
    setOutput("");
    setStderr("");
    setImages([]);
  };

  const execute = async () => {
    if (running) return;
    setRunning(true);
    setOutput("");
    setStderr("");
    setImages([]);
    const r = await run(code);
    setOutput(r.stdout);
    setImages(r.images);
    setStderr(r.stderr);
    setRunning(false);
  };

  return (
    <div className="space-y-3">
      {/* 題型選擇 */}
      <div className="bg-bg-card border border-border rounded-2xl p-3">
        <h3 className="text-xs font-bold text-fg-muted uppercase tracking-wider mb-2 inline-flex items-center gap-1">
          <Brain size={11} /> 業界常見數據分析題型（pandas / numpy / sklearn / matplotlib）
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {EXERCISES.map((ex) => {
            const Icon = ex.icon;
            return (
              <button
                key={ex.name}
                onClick={() => pick(ex)}
                className={`text-left p-3 rounded-xl border transition ${
                  selected.name === ex.name
                    ? "border-purple-400 bg-purple-500/10"
                    : "border-border hover:border-purple-400/50 hover:bg-bg-elevated"
                }`}
              >
                <div className="font-bold text-sm inline-flex items-center gap-1.5">
                  <Icon size={13} className="text-purple-400" />
                  {ex.name}
                </div>
                <div className="text-[10px] text-fg-muted mt-1">{ex.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status + Run */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div>
          {status === "idle" && (
            <button onClick={load} className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 inline-flex items-center gap-1">
              <Download size={11} /> 載入 Python
            </button>
          )}
          {status === "loading" && <span className="text-fg-muted inline-flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> {progress}</span>}
          {status === "ready" && <span className="text-emerald-400">● Python ready · numpy/pandas 已預載完可秒跑</span>}
          {status === "error" && <span className="text-red-400">⚠️ {error}</span>}
        </div>
        <div className="flex items-center gap-2">
          <AskAI code={code} error={stderr} lang="python" context={`Data Lab · ${selected.name}`} />
          <button
            onClick={execute}
            disabled={running || status !== "ready"}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold text-xs inline-flex items-center gap-1 disabled:opacity-50"
          >
            {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
            跑分析
          </button>
        </div>
      </div>

      {/* Editor + Output split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">
            📝 編輯器（隨意改 code、再 Run）
          </div>
          <div className="flex-1 min-h-[450px]">
            <CodeEditor value={code} onChange={setCode} onRun={execute} lang="python" storageKey={`datalab-${selected.name}`} height="100%" minHeight="450px" />
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">
            💬 結果 / 圖表
          </div>
          <div ref={outputRef} className="flex-1 min-h-[450px] overflow-y-auto bg-[#0d1117] p-3 font-mono text-xs">
            {!output && !stderr && images.length === 0 && (
              <div className="text-fg-muted/60">// 選一題、點「跑分析」</div>
            )}
            {output && <pre className="whitespace-pre-wrap text-[#e6edf3] mb-2">{output}</pre>}
            {images.map((b64, i) => (
              <div key={i} className="my-2 bg-[#0d1117] rounded">
                <img src={`data:image/png;base64,${b64}`} alt={`output-${i}`} className="max-w-full rounded" />
              </div>
            ))}
            {stderr && <pre className="whitespace-pre-wrap text-red-400 mt-2">{stderr}</pre>}
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="rounded-xl bg-bg-elevated/30 border border-border p-3 text-[11px] text-fg-muted leading-relaxed">
        <div className="font-bold text-fg mb-1">💡 業界用法</div>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>每題都是業界天天碰到的數據題（電商銷售 / 客戶分群 / 股價 / NLP / API 整合）</li>
          <li>建議：每題先跑原版看結果、再改 seed / 參數 / 加新指標看會怎樣</li>
          <li>圖表自動嵌入：matplotlib 用 <code>print(f&quot;__IMAGE__{`{b64}`}&quot;)</code> 後右邊就會顯示</li>
          <li>進階：把分析結果存成 CSV、可用 <code>df.to_csv()</code> 在 console 輸出</li>
        </ul>
      </div>
    </div>
  );
}
