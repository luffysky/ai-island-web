"use client";

import { useState } from "react";
import { Play, Loader2, ChevronDown, ChevronRight, Lightbulb, CheckCircle2, Target, Trophy, Lock, Download } from "lucide-react";
import { usePyodide } from "@/hooks/usePyodide";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { AskAI } from "@/components/nami/AskAI";

type Exercise = {
  id: string;
  level: "🟢 入門" | "🟡 進階" | "🔴 業界題";
  title: string;
  scenario: string;
  task: string;
  starter: string;
  hints: string[];
  solution: string;
  solutionExplain: string[];
};

const EXERCISES: Exercise[] = [
  // ============ 🟢 入門 ============
  {
    id: "ex1",
    level: "🟢 入門",
    title: "找平均值、最大值、最小值",
    scenario: "店長給你 12 個月的營業額、要做月報。",
    task: "印出全年總和、平均、最高月份、最低月份。",
    starter: `revenue = [320, 410, 380, 520, 600, 580, 720, 650, 540, 480, 590, 700]
months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# 在這裡寫你的解
`,
    hints: [
      "用 `sum(revenue)` 算總和",
      "`len(revenue)` 拿筆數",
      "`max(revenue)` 找最大、`revenue.index(max(revenue))` 找位置",
    ],
    solution: `revenue = [320, 410, 380, 520, 600, 580, 720, 650, 540, 480, 590, 700]
months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

total = sum(revenue)
avg = total / len(revenue)
max_idx = revenue.index(max(revenue))
min_idx = revenue.index(min(revenue))

print(f"總和：{total}")
print(f"平均：{avg:.2f}")
print(f"最高：{months[max_idx]} ({revenue[max_idx]})")
print(f"最低：{months[min_idx]} ({revenue[min_idx]})")
`,
    solutionExplain: [
      "1. `sum(revenue)` 把 12 個月加總",
      "2. 平均 = 總和 / 筆數、用 `len()` 拿筆數",
      "3. `max(revenue)` 拿最大值、`list.index(value)` 拿該值在 list 裡的位置（idx）",
      "4. 拿到 idx 就能用 `months[idx]` 對應月份名",
      "5. f-string `:.2f` 格式化小數兩位",
    ],
  },
  {
    id: "ex2",
    level: "🟢 入門",
    title: "過濾 + 排序",
    scenario: "有一份客戶名單、要找年消費 > 5000 的 VIP、依消費排序。",
    task: "印出 VIP 客戶（消費 > 5000）、由高到低排序。",
    starter: `customers = [
    {"name": "Alice", "spending": 12000},
    {"name": "Bob",   "spending": 3500},
    {"name": "Carol", "spending": 8200},
    {"name": "Dave",  "spending": 4800},
    {"name": "Eva",   "spending": 15600},
    {"name": "Frank", "spending": 2100},
    {"name": "Grace", "spending": 7300},
]

# 在這裡寫你的解
`,
    hints: [
      "用 list comprehension：`[c for c in customers if c['spending'] > 5000]`",
      "排序用 `sorted(list, key=lambda x: x['spending'], reverse=True)`",
    ],
    solution: `customers = [
    {"name": "Alice", "spending": 12000},
    {"name": "Bob",   "spending": 3500},
    {"name": "Carol", "spending": 8200},
    {"name": "Dave",  "spending": 4800},
    {"name": "Eva",   "spending": 15600},
    {"name": "Frank", "spending": 2100},
    {"name": "Grace", "spending": 7300},
]

vip = [c for c in customers if c["spending"] > 5000]
vip_sorted = sorted(vip, key=lambda x: x["spending"], reverse=True)

print(f"找到 {len(vip_sorted)} 位 VIP：\\n")
for i, c in enumerate(vip_sorted, 1):
    print(f"{i}. {c['name']:<8} NT$ {c['spending']:,}")
`,
    solutionExplain: [
      "1. **List comprehension** `[c for c in customers if 條件]`：一行同時做 filter",
      "2. `sorted()` 用 `key=lambda` 指定排序依據（取每個 element 的某個欄位）",
      "3. `reverse=True` = 由大到小",
      "4. `enumerate(list, 1)` 同時拿到 index（從 1 開始）跟值",
      "5. `f-string` 的 `:<8` 左對齊 8 格、`{,}` 千分位",
    ],
  },

  // ============ 🟡 進階 ============
  {
    id: "ex3",
    level: "🟡 進階",
    title: "從 API 抓資料、整理 DataFrame",
    scenario: "業界天天做：呼叫 API → 拿 JSON → 轉成 DataFrame 分析。今天的客戶要看「全球幾個熱門城市的天氣」。",
    task: "用 wttr.in API 抓 5 個城市的天氣、整成 DataFrame、列出溫度排序。",
    starter: `# 你的 starter code
import micropip
await micropip.install(["pandas"])
import pandas as pd
import json
from js import fetch, encodeURIComponent

cities = ["Taipei", "Tokyo", "Seoul", "Singapore", "Hong+Kong"]

# 提示：每個城市呼叫 https://wttr.in/{city}?format=j1
# 結果是 JSON、結構：data["current_condition"][0]["temp_C"]

results = []
for city in cities:
    # 在這寫
    pass

# 整成 DataFrame、依溫度排序
`,
    hints: [
      "fetch 寫法：`await fetch('/api/admin/playground/scrape?url=' + encodeURIComponent(f'https://wttr.in/{city}?format=j1'))`",
      "用 `json.loads(data[\"body\"])` 把 JSON 字串轉物件",
      "溫度在 `result[\"current_condition\"][0][\"temp_C\"]`、轉成 int",
      "天氣描述在 `result[\"current_condition\"][0][\"weatherDesc\"][0][\"value\"]`",
    ],
    solution: `import micropip
await micropip.install(["pandas"])
import pandas as pd
import json
from js import fetch, encodeURIComponent

cities = ["Taipei", "Tokyo", "Seoul", "Singapore", "Hong+Kong"]

results = []
for city in cities:
    url = f"https://wttr.in/{city}?format=j1"
    resp = await fetch("/api/admin/playground/scrape?url=" + encodeURIComponent(url))
    data = (await resp.json()).to_py()
    weather = json.loads(data["body"])
    cur = weather["current_condition"][0]
    results.append({
        "city": city.replace("+", " "),
        "temp_C": int(cur["temp_C"]),
        "feels_like": int(cur["FeelsLikeC"]),
        "humidity": int(cur["humidity"]),
        "desc": cur["weatherDesc"][0]["value"],
    })

df = pd.DataFrame(results).sort_values("temp_C", ascending=False)
print(df.to_string(index=False))
`,
    solutionExplain: [
      "1. 業界流程：**fetch URL → 解 JSON → 攤平成 DataFrame 結構**",
      "2. wttr.in 是免費天氣 API、`?format=j1` 回 JSON",
      "3. 每個城市丟一次 fetch、結果累積到 list of dict",
      "4. `pd.DataFrame(list_of_dict)` 直接轉成表格",
      "5. `sort_values(col, ascending=False)` 排序",
      "6. `to_string(index=False)` 印整齊、不顯示 index 列",
    ],
  },
  {
    id: "ex4",
    level: "🟡 進階",
    title: "Groupby + Pivot Table",
    scenario: "業務經理要每個業務員、每個季度的成交金額表（橫向比較）。",
    task: "把 raw 訂單 → groupby 後 pivot 成「業務員 × 季度」交叉表。",
    starter: `import micropip
await micropip.install(["pandas"])
import pandas as pd
import random
from datetime import datetime, timedelta

random.seed(1)
sales_people = ["Amy", "Bob", "Cathy", "David"]
rows = []
for d in range(120):  # 4 個月 ~ 120 天
    date = datetime(2026, 1, 1) + timedelta(days=d)
    for _ in range(random.randint(2, 8)):
        rows.append({
            "date": date,
            "sales_person": random.choice(sales_people),
            "amount": random.choice([15000, 22000, 35000, 8000, 50000]),
        })

df = pd.DataFrame(rows)
df["quarter"] = df["date"].dt.to_period("Q")

# 在這寫：把 df pivot 成「業務員 × 季度」、值是該季成交金額總和
`,
    hints: [
      "`pd.pivot_table(df, index='sales_person', columns='quarter', values='amount', aggfunc='sum')`",
      "再加 `fill_value=0` 處理空格",
      "可加 `margins=True` 自動產生 Total 行/列",
    ],
    solution: `import micropip
await micropip.install(["pandas"])
import pandas as pd
import random
from datetime import datetime, timedelta

random.seed(1)
sales_people = ["Amy", "Bob", "Cathy", "David"]
rows = []
for d in range(120):
    date = datetime(2026, 1, 1) + timedelta(days=d)
    for _ in range(random.randint(2, 8)):
        rows.append({
            "date": date,
            "sales_person": random.choice(sales_people),
            "amount": random.choice([15000, 22000, 35000, 8000, 50000]),
        })

df = pd.DataFrame(rows)
df["quarter"] = df["date"].dt.to_period("Q")

pivot = pd.pivot_table(
    df,
    index="sales_person",
    columns="quarter",
    values="amount",
    aggfunc="sum",
    fill_value=0,
    margins=True,
    margins_name="總計",
)
print("=== 業務員 × 季度成交金額 ===\\n")
print(pivot)

# 找每季 top 業務員
print("\\n\\n=== 每季 top 業務員 ===")
for q in df["quarter"].unique():
    top = df[df["quarter"] == q].groupby("sales_person")["amount"].sum().idxmax()
    amt = df[df["quarter"] == q].groupby("sales_person")["amount"].sum().max()
    print(f"  {q}: {top} (NT$ {amt:,})")
`,
    solutionExplain: [
      "1. **pivot_table 是 Excel 樞紐分析的 Python 版** — 業界做月報的標配",
      "2. `index=` 行（業務員）、`columns=` 列（季度）、`values=` 要彙總的欄位、`aggfunc=` 怎麼彙總（sum / mean / count）",
      "3. `fill_value=0` 把空格用 0 補（沒交易的季度）",
      "4. `margins=True` 自動加「總計」這一行 / 列",
      "5. 找每季 top：`groupby()` + `idxmax()` 拿到最大值對應的 index 名稱",
      "6. **業界擴展**：把 pivot 結果 `.to_excel()` 直接給老闆",
    ],
  },
  {
    id: "ex5",
    level: "🟡 進階",
    title: "正則表達式爬部落格",
    scenario: "我們網站有部落格 RSS 介面、要抓所有公開文章的標題 + 發布日期、做成 CSV 給行銷。",
    task: "用 regex 從 HTML 抓文章標題 + 發布時間。",
    starter: `# 抓 books.toscrape.com 首頁所有書名 + 價格、用 regex
import re
from js import fetch, encodeURIComponent

resp = await fetch("/api/admin/playground/scrape?url=" + encodeURIComponent("https://books.toscrape.com"))
data = (await resp.json()).to_py()
html = data["body"]

# 任務：用 regex 找出
#   - title (在 <a title="...">)
#   - price (在 <p class="price_color">£X.XX</p>)
# 然後配對成 (title, price) 的 list
`,
    hints: [
      "`re.findall(r'<a[^>]*title=\"([^\"]+)\"', html)` 找 title 屬性",
      "`re.findall(r'<p class=\"price_color\">([^<]+)</p>', html)` 找價格",
      "假設兩個 list 對應、用 `zip()` 配對",
    ],
    solution: `import re
from js import fetch, encodeURIComponent

resp = await fetch("/api/admin/playground/scrape?url=" + encodeURIComponent("https://books.toscrape.com"))
data = (await resp.json()).to_py()
html = data["body"]

# 1. 用 article 區塊分塊（避免亂配）
articles = re.findall(r'<article class="product_pod">(.*?)</article>', html, re.S)
print(f"找到 {len(articles)} 個書本區塊\\n")

# 2. 每塊內單獨抓 title + price + rating
books = []
for a in articles:
    title_m = re.search(r'<a[^>]*title="([^"]+)"', a)
    price_m = re.search(r'<p class="price_color">([^<]+)</p>', a)
    rating_m = re.search(r'<p class="star-rating ([^"]+)"', a)
    avail_m = re.search(r'<p class="instock availability">(.*?)</p>', a, re.S)
    if title_m and price_m:
        books.append({
            "title": title_m.group(1),
            "price": price_m.group(1).replace("£", "").strip(),
            "rating": rating_m.group(1) if rating_m else "?",
            "available": "In stock" if avail_m and "In stock" in avail_m.group(1) else "?",
        })

# 3. 印報表
print(f"{'評分':<8} {'價格':<10} {'庫存':<12} {'書名'}")
print("-" * 90)
for b in books:
    print(f"{b['rating']:<8} £{b['price']:<9} {b['available']:<12} {b['title'][:50]}")

# 4. 統計
print(f"\\n=== 統計 ===")
print(f"總書數：{len(books)}")
from collections import Counter
ratings = Counter(b["rating"] for b in books)
print(f"評分分布：{dict(ratings)}")
`,
    solutionExplain: [
      "1. **業界爬蟲守則**：先用大區塊（`<article>`）切開、再單獨在區塊內抓欄位、避免欄位亂配",
      "2. `re.S` (DOTALL) 讓 `.` 也匹配換行、抓多行內容用",
      "3. `re.search` vs `re.findall`：search 找第一個、findall 找全部",
      "4. `match.group(1)` 拿第一個 capture group `(...)` 的內容",
      "5. **真實環境**：HTML 結構會變、要寫得有 fallback（每個 `re.search` 都檢查 None）",
      "6. **業界進階**：BeautifulSoup4 比 regex 穩、但 Pyodide 載入較久、先學 regex",
    ],
  },

  // ============ 🔴 業界題 ============
  {
    id: "ex6",
    level: "🔴 業界題",
    title: "RFM 客戶分析 + 自動分群",
    scenario: "PM 給你 1000 個客戶的交易資料、要做 RFM 分析（最近一次 / 頻次 / 金額）找出 4 種客群、給行銷活動用。",
    task: "計算 RFM 分數、用 K-Means 自動分 4 群、給每群一個有意義的 label。",
    starter: `# 客戶交易資料已生成、計算 RFM、分群、給 label
import micropip
await micropip.install(["pandas", "numpy", "scikit-learn"])
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

# 模擬 1000 客戶各自的 RFM 原始數據
np.random.seed(42)
n = 1000
df = pd.DataFrame({
    "customer_id":   [f"u{i:04d}" for i in range(n)],
    "recency_days":  np.abs(np.random.exponential(60, n)).astype(int),
    "frequency":     np.random.poisson(5, n) + 1,
    "monetary":      np.random.lognormal(7, 1, n).round(0),
})

# 任務：
# 1. 把 R/F/M 標準化（StandardScaler）
# 2. K-Means 分 4 群
# 3. 算每群的平均 R/F/M
# 4. 用平均值給每群一個 label：
#    - R 低 + F 高 + M 高 → 🌟 超級客戶
#    - F 高、R 中 → 💎 常客
#    - R 高（很久沒買）→ ⚠️ 流失預警
#    - 其他 → 👋 一般
`,
    hints: [
      "標準化：`StandardScaler().fit_transform(df[['recency_days', 'frequency', 'monetary']])`",
      "K-Means：`KMeans(n_clusters=4, random_state=42, n_init=10).fit_predict(X)`",
      "群統計：`df.groupby('cluster')[['recency_days', 'frequency', 'monetary']].mean()`",
      "label 自動判定：寫一個 function 看每群的 R/F/M 數字、用 if/elif 標 label",
    ],
    solution: `import micropip
await micropip.install(["pandas", "numpy", "scikit-learn"])
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

np.random.seed(42)
n = 1000
df = pd.DataFrame({
    "customer_id":   [f"u{i:04d}" for i in range(n)],
    "recency_days":  np.abs(np.random.exponential(60, n)).astype(int),
    "frequency":     np.random.poisson(5, n) + 1,
    "monetary":      np.random.lognormal(7, 1, n).round(0),
})

# 1. 標準化
features = ["recency_days", "frequency", "monetary"]
X = StandardScaler().fit_transform(df[features])

# 2. K-Means 分 4 群
km = KMeans(n_clusters=4, random_state=42, n_init=10)
df["cluster"] = km.fit_predict(X)

# 3. 群統計
summary = df.groupby("cluster")[features].mean().round(1)
summary["人數"] = df.groupby("cluster").size()

# 4. 自動 label
def auto_label(row):
    r, f, m = row["recency_days"], row["frequency"], row["monetary"]
    if r < 40 and f >= 6 and m >= 2000:
        return "🌟 超級客戶"
    elif r < 60 and f >= 5:
        return "💎 常客"
    elif r > 120:
        return "⚠️ 流失預警"
    else:
        return "👋 一般客"

summary["label"] = summary.apply(auto_label, axis=1)

print("=== K-Means 4 群分析 ===\\n")
print(summary[["人數", "recency_days", "frequency", "monetary", "label"]])

# 5. 行銷活動建議
print("\\n=== 建議的行銷活動 ===")
for cluster_id, row in summary.iterrows():
    print(f"\\n群 {cluster_id} - {row['label']} ({int(row['人數'])} 人)")
    label = row['label']
    if "超級" in label:
        print(f"  → 推 VIP 限定商品、提早通知新品")
    elif "常客" in label:
        print(f"  → 推升級到 VIP 的方案、累積點數")
    elif "流失" in label:
        print(f"  → 召回券：寄 \\"我們想你\\" 折扣碼")
    else:
        print(f"  → 推新人優惠、增加品牌曝光")
`,
    solutionExplain: [
      "1. **RFM 是電商 / 訂閱業務最經典的分群法** — Recency (最近購買) / Frequency (頻次) / Monetary (金額)",
      "2. K-Means 需要先 standardize、不然 monetary 數值大會主宰群",
      "3. `n_init=10` 跑 10 次取最好、避免 K-Means 受初始點影響",
      "4. 分群結果只有編號 (0/1/2/3)、需要人工 label 才有商業意義",
      "5. **業界做法**：把分群結果寫回 DB、定時 (每週) 重跑、自動觸發對應行銷活動",
      "6. **進階**：可以用 hierarchical clustering 或 DBSCAN 比較、找最適合的方法",
    ],
  },
  {
    id: "ex7",
    level: "🔴 業界題",
    title: "時間序列預測 — 移動平均 + 線性回歸",
    scenario: "老闆要你預測「下個月營收」、給你過去 24 個月的資料。",
    task: "用移動平均 + 線性回歸做簡單預測、印出下 3 個月的預測值。",
    starter: `import micropip
await micropip.install(["pandas", "numpy", "scikit-learn"])
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

# 過去 24 個月營收（有上升趨勢 + 季節性）
np.random.seed(7)
months = np.arange(24)
trend = months * 8 + 200            # 上升趨勢
seasonal = 30 * np.sin(months * np.pi / 6)  # 半年週期
noise = np.random.randn(24) * 15
revenue = (trend + seasonal + noise).round(1)

df = pd.DataFrame({"month_idx": months, "revenue": revenue})

# 任務：
# 1. 算 3 個月移動平均 (MA3)
# 2. 用線性回歸找趨勢
# 3. 預測接下來 3 個月
`,
    hints: [
      "移動平均：`df['MA3'] = df['revenue'].rolling(3).mean()`",
      "Linear Regression：`LinearRegression().fit(X.reshape(-1, 1), y)`、X 要 2D",
      "預測：`model.predict(np.array([24, 25, 26]).reshape(-1, 1))`",
    ],
    solution: `import micropip
await micropip.install(["pandas", "numpy", "scikit-learn"])
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

np.random.seed(7)
months = np.arange(24)
trend = months * 8 + 200
seasonal = 30 * np.sin(months * np.pi / 6)
noise = np.random.randn(24) * 15
revenue = (trend + seasonal + noise).round(1)

df = pd.DataFrame({"month_idx": months, "revenue": revenue})

# 1. 移動平均
df["MA3"] = df["revenue"].rolling(3).mean().round(1)
df["MA6"] = df["revenue"].rolling(6).mean().round(1)

print("=== 過去 24 個月 ===")
print(df.tail(8))

# 2. 線性回歸
X = df["month_idx"].values.reshape(-1, 1)
y = df["revenue"].values
model = LinearRegression().fit(X, y)
slope = model.coef_[0]
intercept = model.intercept_
r2 = model.score(X, y)

print(f"\\n=== 趨勢線 ===")
print(f"revenue ≈ {slope:.2f} × month + {intercept:.2f}")
print(f"R² (擬合度): {r2:.3f}")

# 3. 預測未來 3 個月
future_months = np.array([24, 25, 26])
predictions = model.predict(future_months.reshape(-1, 1))

print(f"\\n=== 預測 ===")
for m, p in zip(future_months, predictions):
    print(f"  月 {m + 1} (next): {p:.1f}")

# 4. 計算簡單信賴區間（用過去 24 個月的殘差標準差 ±2σ ~ 95%）
residuals = y - model.predict(X)
sigma = residuals.std()

print(f"\\n=== 預測 + 95% 信賴區間 (±2σ) ===")
print(f"殘差 σ = {sigma:.2f}")
for m, p in zip(future_months, predictions):
    low = p - 2 * sigma
    high = p + 2 * sigma
    print(f"  月 {m + 1}: {p:.0f} ({low:.0f} ~ {high:.0f})")
`,
    solutionExplain: [
      "1. **業界預測流程**：先看趨勢 (Trend) + 季節性 (Seasonality) + 噪音",
      "2. 移動平均 (Moving Average) 平滑短期噪音、看長期方向",
      "3. Linear Regression 是最簡單的趨勢預測、R² 越接近 1 表示線性擬合越好",
      "4. **預測一定要附信賴區間**：用過去殘差的標準差 ±2σ 給 95% CI",
      "5. **限制**：純線性回歸不抓季節性、進階用 ARIMA / Prophet / LSTM",
      "6. **業界進階**：把趨勢線斜率 (slope) 變成月增長率 KPI 給老闆看",
    ],
  },
];

const LEVEL_COLORS = {
  "🟢 入門": "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
  "🟡 進階": "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
  "🔴 業界題": "bg-red-500/10 border-red-500/30 text-red-300",
};

export function Exercises() {
  const { status, progress, error, load, run } = usePyodide();
  const [active, setActive] = useState<string>(EXERCISES[0].id);
  const ex = EXERCISES.find((e) => e.id === active)!;
  const [code, setCode] = useState(ex.starter);
  const [output, setOutput] = useState("");
  const [stderr, setStderr] = useState("");
  const [running, setRunning] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showExplain, setShowExplain] = useState(false);

  const pickExercise = (id: string) => {
    setActive(id);
    const next = EXERCISES.find((e) => e.id === id)!;
    setCode(next.starter);
    setOutput("");
    setStderr("");
    setShowHints(false);
    setShowSolution(false);
    setShowExplain(false);
  };

  const run_code = async () => {
    if (running) return;
    setRunning(true);
    setOutput("");
    setStderr("");
    const r = await run(code);
    setOutput(r.stdout);
    setStderr(r.stderr);
    setRunning(false);
  };

  const loadSolution = () => {
    setCode(ex.solution);
    setShowSolution(true);
  };

  return (
    <div className="space-y-3">
      {/* 題目選擇 */}
      <div className="bg-bg-card border border-border rounded-2xl p-3">
        <h3 className="text-xs font-bold text-fg-muted uppercase tracking-wider mb-2 inline-flex items-center gap-1">
          <Trophy size={11} /> 練習題（{EXERCISES.length} 題、入門 → 業界）
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {EXERCISES.map((e) => (
            <button
              key={e.id}
              onClick={() => pickExercise(e.id)}
              className={`text-left p-3 rounded-xl border transition ${
                active === e.id
                  ? "border-purple-400 bg-purple-500/10"
                  : "border-border hover:border-purple-400/50 hover:bg-bg-elevated"
              }`}
            >
              <div className={`text-[10px] inline-block px-2 py-0.5 rounded-full mb-1.5 border ${LEVEL_COLORS[e.level]}`}>
                {e.level}
              </div>
              <div className="font-bold text-sm">{e.title}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 題目卡 */}
      <div key={ex.id} className="bg-bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${LEVEL_COLORS[ex.level]}`}>{ex.level}</span>
          <h2 className="font-extrabold text-lg">{ex.title}</h2>
        </div>

        <section className="text-sm text-fg-muted bg-bg-elevated rounded-xl p-3 leading-relaxed">
          <div className="font-bold text-fg inline-flex items-center gap-1 mb-1">
            <Target size={12} className="text-purple-400" /> 情境
          </div>
          {ex.scenario}
        </section>

        <section className="text-sm bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 leading-relaxed">
          <div className="font-bold inline-flex items-center gap-1 mb-1 text-purple-300">
            <CheckCircle2 size={12} /> 你要做
          </div>
          {ex.task}
        </section>

        {/* 隱藏提示 */}
        <div className="border border-yellow-500/30 rounded-xl overflow-hidden bg-yellow-500/5">
          <button
            onClick={() => setShowHints((v) => !v)}
            className="w-full px-3 py-2 flex items-center justify-between text-sm font-bold text-yellow-300 hover:bg-yellow-500/10"
          >
            <span className="inline-flex items-center gap-1.5">
              {showHints ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Lightbulb size={13} />
              💡 提示（卡住再看、{ex.hints.length} 條）
            </span>
            {!showHints && <Lock size={11} className="opacity-50" />}
          </button>
          {showHints && (
            <div className="px-3 pb-3 space-y-1.5 text-xs text-fg-muted">
              {ex.hints.map((h, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-yellow-400 font-bold">{i + 1}.</span>
                  <span dangerouslySetInnerHTML={{ __html: h.replace(/`([^`]+)`/g, '<code class="bg-bg px-1 rounded text-yellow-200">$1</code>') }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 隱藏解答 */}
        <div className="border border-emerald-500/30 rounded-xl overflow-hidden bg-emerald-500/5">
          <button
            onClick={() => setShowSolution((v) => !v)}
            className="w-full px-3 py-2 flex items-center justify-between text-sm font-bold text-emerald-300 hover:bg-emerald-500/10"
          >
            <span className="inline-flex items-center gap-1.5">
              {showSolution ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <CheckCircle2 size={13} />
              ✅ 完整解答（自己寫完再看）
            </span>
            {!showSolution && <Lock size={11} className="opacity-50" />}
          </button>
          {showSolution && (
            <div className="px-3 pb-3 space-y-2">
              <button
                onClick={loadSolution}
                className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
              >
                <Download size={9} className="inline mr-0.5" />
                把解答載入到上面編輯器
              </button>
              <pre className="bg-[#0d1117] text-[#e6edf3] font-mono text-[11px] p-3 rounded-lg overflow-x-auto whitespace-pre">
                {ex.solution}
              </pre>
              <button
                onClick={() => setShowExplain((v) => !v)}
                className="text-xs text-emerald-300 hover:underline inline-flex items-center gap-1"
              >
                {showExplain ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                解答逐步說明（{ex.solutionExplain.length} 點）
              </button>
              {showExplain && (
                <div className="text-xs text-fg-muted space-y-1 mt-1 pl-3 border-l-2 border-emerald-500/30">
                  {ex.solutionExplain.map((line, i) => (
                    <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/`([^`]+)`/g, '<code class="bg-bg px-1 rounded text-emerald-300">$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b class="text-fg">$1</b>') }} />
                  ))}
                </div>
              )}
            </div>
          )}
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
          {status === "ready" && <span className="text-emerald-400">● Python ready</span>}
          {status === "error" && <span className="text-red-400">⚠️ {error}</span>}
        </div>
        <div className="flex items-center gap-2">
          <AskAI code={code} error={stderr} lang="python" context={`練習題 · ${ex.title}`} />
          <button
            onClick={run_code}
            disabled={running || status !== "ready"}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold text-xs inline-flex items-center gap-1 disabled:opacity-50"
          >
            {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
            試跑你的解
            <span className="text-[9px] opacity-70 ml-1">⌘↵</span>
          </button>
        </div>
      </div>

      {/* Editor + Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">📝 你的解</div>
          <CodeEditor value={code} onChange={setCode} onRun={run_code} lang="python" storageKey={`ex-${ex.id}`} height="400px" minHeight="400px" />
        </div>
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">💬 你的結果</div>
          <div className="flex-1 min-h-[400px] p-3 bg-[#0d1117] overflow-y-auto font-mono text-xs">
            {output && <pre className="whitespace-pre-wrap text-[#e6edf3]">{output}</pre>}
            {stderr && <pre className="whitespace-pre-wrap text-red-400 mt-2">{stderr}</pre>}
            {!output && !stderr && <span className="text-fg-muted/60">// 寫完 code 點「試跑」</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
