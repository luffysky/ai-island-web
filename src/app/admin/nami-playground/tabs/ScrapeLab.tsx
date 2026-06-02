"use client";

import { useState } from "react";
import { Play, Loader2, Globe, ExternalLink, Download } from "lucide-react";
import { usePyodide } from "@/hooks/usePyodide";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { AskAI } from "@/components/nami/AskAI";

// 業界常用 API + 練習站、全部合法
const PRESET_SITES = [
  // ============ JSON API（最容易上手）============
  {
    name: "💰 CoinGecko 加密貨幣價格",
    url: "https://api.coingecko.com/api/v3/coins/markets",
    note: "業界用：金融儀表板、追蹤幣價",
    code: `# 抓 CoinGecko 加密貨幣 top 20 + 24hr 漲跌
import json
from js import fetch, encodeURIComponent

url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20"
resp = await fetch("/api/admin/playground/scrape?url=" + encodeURIComponent(url))
data = (await resp.json()).to_py()
coins = json.loads(data["body"])

print(f"{'排名':<4} {'符號':<8} {'價格 USD':<14} {'24hr':<10} {'市值'}")
print("-" * 60)
for c in coins:
    chg = c.get("price_change_percentage_24h", 0) or 0
    arrow = "📈" if chg >= 0 else "📉"
    mcap = c.get("market_cap", 0)
    mcap_b = mcap / 1_000_000_000
    print(f"{c['market_cap_rank']:<4} {c['symbol'].upper():<8} \${c['current_price']:<13,.2f} {arrow}{chg:+6.2f}% {mcap_b:>8,.1f}B")
`,
  },
  {
    name: "💱 ExchangeRate 匯率",
    url: "https://open.er-api.com/v6/latest/USD",
    note: "業界用：跨幣別計算、財報換算",
    code: `# 抓即時匯率、計算 TWD/JPY/CNY/EUR vs USD
import json
from js import fetch, encodeURIComponent
url = "https://open.er-api.com/v6/latest/USD"
resp = await fetch("/api/admin/playground/scrape?url=" + encodeURIComponent(url))
data = (await resp.json()).to_py()
rates = json.loads(data["body"])["rates"]

print(f"基準：1 USD = ?\\n")
for code in ["TWD", "JPY", "CNY", "EUR", "GBP", "HKD", "KRW", "SGD"]:
    if code in rates:
        print(f"  {code}: {rates[code]:>10,.4f}")

# 業界常見題：「100 美金值多少台幣 / 日圓 / 歐元」
amount = 100
print(f"\\n\\n試算：{amount} USD =")
print(f"  TWD: NT$ {amount * rates['TWD']:,.0f}")
print(f"  JPY: ¥  {amount * rates['JPY']:,.0f}")
print(f"  EUR: €  {amount * rates['EUR']:,.2f}")
`,
  },
  {
    name: "🐙 GitHub Trending API",
    url: "https://api.github.com/search/repositories",
    note: "業界用：技術趨勢分析、競品研究",
    code: `# 抓 GitHub 上週新增 star 最多的 Python repo
import json
from datetime import datetime, timedelta
from js import fetch, encodeURIComponent

last_week = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
url = f"https://api.github.com/search/repositories?q=language:python+created:>{last_week}&sort=stars&order=desc&per_page=10"
resp = await fetch("/api/admin/playground/scrape?url=" + encodeURIComponent(url))
data = (await resp.json()).to_py()
result = json.loads(data["body"])

print(f"📊 上週 (從 {last_week}) star 最多的 Python repo top 10：\\n")
for i, r in enumerate(result["items"], 1):
    desc = (r.get("description") or "")[:60]
    print(f"{i:2}. ⭐ {r['stargazers_count']:>6,} | {r['full_name']}")
    if desc:
        print(f"      {desc}")
    print()
`,
  },
  {
    name: "📦 NPM package 統計",
    url: "https://registry.npmjs.org/react/latest",
    note: "業界用：技術棧分析、套件比較 (用 /latest endpoint 避免 30MB 全量 JSON)",
    code: `# 比較 React / Vue / Svelte 主流框架 latest 資訊
# 用 /{pkg}/latest 端點 (回 < 5KB)、不抓 /{pkg} (含全部 version 歷史、可能 30MB)
import json
from js import fetch, encodeURIComponent

packages = ["react", "vue", "svelte", "next", "nuxt"]
results = []
for pkg in packages:
    url = f"https://registry.npmjs.org/{pkg}/latest"
    resp = await fetch("/api/admin/playground/scrape?url=" + encodeURIComponent(url))
    data = (await resp.json()).to_py()
    body = data.get("body", "")
    if not body:
        print(f"❌ {pkg}: {data.get('error', '無 body')}")
        continue
    info = json.loads(body)
    results.append({
        "name": pkg,
        "latest": info.get("version", "?"),
        "homepage": info.get("homepage", "")[:50],
        "description": (info.get("description") or "")[:60],
        "license": info.get("license", "?"),
    })

print(f"{'package':<10} {'latest':<10} {'license':<10}")
print("-" * 60)
for r in results:
    print(f"{r['name']:<10} {r['latest']:<10} {r['license']:<10}")
    print(f"  → {r['description']}\\n")
`,
  },
  {
    name: "📡 SpaceX / 太空新聞 API",
    url: "https://api.spaceflightnewsapi.net/v4/articles",
    note: "業界用：新聞聚合、輿情分析",
    code: `# 抓最新 10 篇太空新聞
import json
from js import fetch, encodeURIComponent
url = "https://api.spaceflightnewsapi.net/v4/articles?limit=10"
resp = await fetch("/api/admin/playground/scrape?url=" + encodeURIComponent(url))
data = (await resp.json()).to_py()
result = json.loads(data["body"])

print(f"📡 最新 10 篇太空新聞：\\n")
for i, a in enumerate(result["results"], 1):
    print(f"{i:2}. {a['title']}")
    print(f"    {a['news_site']} | {a['published_at'][:10]}")
    print(f"    {a['summary'][:80]}...\\n")
`,
  },
  {
    name: "🌍 國家資料庫 RESTCountries",
    url: "https://restcountries.com/v3.1/all",
    note: "業界用：地理資料、人口統計分析",
    code: `# 抓全世界國家、找人口最多的 10 個
import json
from js import fetch, encodeURIComponent
url = "https://restcountries.com/v3.1/all?fields=name,population,area,capital,region,languages,currencies"
resp = await fetch("/api/admin/playground/scrape?url=" + encodeURIComponent(url))
data = (await resp.json()).to_py()
countries = json.loads(data["body"])

# 排序找人口 top 10
sorted_pop = sorted(countries, key=lambda c: c.get("population", 0), reverse=True)[:10]

print(f"🌍 全球人口 top 10：\\n")
print(f"{'排名':<4} {'國家':<25} {'人口':<15} {'面積 km²':<12} {'首都'}")
print("-" * 70)
for i, c in enumerate(sorted_pop, 1):
    name = c.get("name", {}).get("common", "?")
    pop = c.get("population", 0)
    area = c.get("area", 0)
    cap = ", ".join(c.get("capital", ["—"]))
    print(f"{i:<4} {name:<25} {pop:>13,}  {area:>10,.0f}  {cap}")
`,
  },
  {
    name: "🏝️ AI 島本站 chapters",
    url: "/chapters",
    note: "練習：抓本站所有章節標題 + 副標",
    code: `# 爬 AI 島本站 chapters 頁面、找章節卡標題
import json
from js import fetch, console

# 透過後端 proxy 爬 (admin only)
resp = await fetch("/api/admin/playground/scrape?url=" + encodeURIComponent("/chapters"))
data = (await resp.json()).to_py()
html = data["body"]

# 簡單抓 <h3 class="..."> 找章節標題
import re
titles = re.findall(r'<h3[^>]*>([^<]+)</h3>', html)
print(f"找到 {len(titles)} 個 h3 標題")
for i, t in enumerate(titles[:20], 1):
    print(f"{i:2}. {t.strip()}")
`,
  },
  {
    name: "📚 Books to Scrape (官方練習站)",
    url: "https://books.toscrape.com",
    note: "免費合法爬蟲練習站、無 robots 限制",
    code: `# 抓 books.toscrape.com 首頁書名 + 價格 + 評分
import re
from js import fetch
resp = await fetch("/api/admin/playground/scrape?url=" + encodeURIComponent("https://books.toscrape.com"))
data = (await resp.json()).to_py()
html = data["body"]

# 找 <article class="product_pod">
products = re.findall(r'<article class="product_pod">(.*?)</article>', html, re.S)
print(f"找到 {len(products)} 本書\\n")

results = []
for p in products[:10]:
    title_m = re.search(r'<a[^>]*title="([^"]+)"', p)
    price_m = re.search(r'<p class="price_color">([^<]+)</p>', p)
    rating_m = re.search(r'<p class="star-rating ([^"]+)"', p)
    if title_m and price_m:
        results.append({
            "title": title_m.group(1),
            "price": price_m.group(1),
            "rating": rating_m.group(1) if rating_m else "?",
        })

for r in results:
    print(f"{r['rating']:5} | {r['price']:8} | {r['title']}")
`,
  },
  {
    name: "💬 Quotes to Scrape",
    url: "https://quotes.toscrape.com",
    note: "經典練習站、抓名言佳句",
    code: `# 抓 quotes.toscrape.com 首頁名言 + 作者 + tag
# 注意：實際 HTML 是 <div class="quote" itemscope ...> 不是純 <div class="quote">
# regex 用 [^>]* 容納額外屬性才會 match
import re
from js import fetch
resp = await fetch("/api/admin/playground/scrape?url=" + encodeURIComponent("https://quotes.toscrape.com"))
data = (await resp.json()).to_py()
html = data["body"]

# 用 article 風格切塊 (<div class="quote" itemscope...> ... </div>)
quotes = re.findall(r'<div class="quote"[^>]*>(.*?)</div>\\s*</div>', html, re.S)
print(f"找到 {len(quotes)} 句名言\\n")

for i, q in enumerate(quotes[:8], 1):
    text_m = re.search(r'<span class="text"[^>]*>(.*?)</span>', q, re.S)
    author_m = re.search(r'<small class="author"[^>]*>([^<]+)</small>', q)
    tags = re.findall(r'<a class="tag"[^>]*>([^<]+)</a>', q)
    if text_m and author_m:
        # 解 HTML entities
        text = text_m.group(1).replace("&ldquo;", "「").replace("&rdquo;", "」").replace("&quot;", '"')
        print(f"{i}. {text[:90]}")
        print(f"   — {author_m.group(1)}")
        if tags:
            print(f"   #{' #'.join(tags)}")
        print()
`,
  },
  {
    name: "🔥 Hacker News Top 30",
    url: "https://hacker-news.firebaseio.com/v0/topstories.json",
    note: "官方 JSON API、合法、無 CORS 問題",
    code: `# 抓 HN 熱門前 30 篇
import json
from js import fetch

# 先抓 id 列表
resp = await fetch("/api/admin/playground/scrape?url=" + encodeURIComponent("https://hacker-news.firebaseio.com/v0/topstories.json"))
data = (await resp.json()).to_py()
import json
ids = json.loads(data["body"])[:10]
print(f"前 10 篇熱門 ID：{ids}\\n")

# 依次拿每篇詳情
for i, story_id in enumerate(ids, 1):
    r = await fetch(f"/api/admin/playground/scrape?url=" + encodeURIComponent(f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json"))
    d = (await r.json()).to_py()
    story = json.loads(d["body"])
    print(f"{i:2}. [{story.get('score', 0):4}↑] {story.get('title', '')[:70]}")
`,
  },
  {
    name: "🇼 Wikipedia API",
    url: "https://en.wikipedia.org/w/api.php",
    note: "Wikipedia 官方 API、各種主題搜尋",
    code: `# 用 Wikipedia API 搜「Taiwan」前 5 個結果
import json
from js import fetch, encodeURIComponent
import re

url = "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=Taiwan&format=json&srlimit=5"
resp = await fetch("/api/admin/playground/scrape?url=" + encodeURIComponent(url))
data = (await resp.json()).to_py()
body = data.get("body", "")
if not body:
    print(f"❌ Wikipedia API 失敗：{data.get('error', '無 body')}")
else:
    result = json.loads(body)
    search = result.get("query", {}).get("search", [])
    print(f"找到 {len(search)} 個結果\\n")
    for i, item in enumerate(search, 1):
        print(f"{i}. {item['title']}")
        # 移除 wiki 的 highlight HTML
        snippet = re.sub(r'<[^>]+>', '', item.get('snippet', ''))
        print(f"   {snippet[:120]}...\\n")
`,
  },
];

export function ScrapeLab() {
  const { status, progress, error, load, run } = usePyodide();
  const [selected, setSelected] = useState(PRESET_SITES[0]);
  const [code, setCode] = useState(PRESET_SITES[0].code);
  const [output, setOutput] = useState<string>("");
  const [stderr, setStderr] = useState<string>("");
  const [running, setRunning] = useState(false);

  const pick = (site: typeof PRESET_SITES[number]) => {
    setSelected(site);
    setCode(site.code);
    setOutput("");
    setStderr("");
  };

  const execute = async () => {
    if (running) return;
    setRunning(true);
    setOutput("");
    setStderr("");
    // 注入 encodeURIComponent
    const fullCode = `from js import encodeURIComponent\n${code}`;
    const r = await run(fullCode);
    setOutput(r.stdout);
    setStderr(r.stderr);
    setRunning(false);
  };

  return (
    <div className="space-y-3">
      {/* Site picker */}
      <div className="bg-bg-card border border-border rounded-2xl p-3">
        <h3 className="text-xs font-bold text-fg-muted uppercase tracking-wider mb-2 inline-flex items-center gap-1">
          <Globe size={11} /> 預設練習站（合法可爬）
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {PRESET_SITES.map((s) => (
            <button
              key={s.name}
              onClick={() => pick(s)}
              className={`text-left p-3 rounded-xl border transition ${
                selected.name === s.name
                  ? "border-purple-400 bg-purple-500/10"
                  : "border-border hover:border-purple-400/50 hover:bg-bg-elevated"
              }`}
            >
              <div className="font-bold text-sm">{s.name}</div>
              <div className="text-[10px] text-fg-muted line-clamp-2 mt-0.5">{s.note}</div>
              <a
                href={s.url.startsWith("/") ? s.url : s.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] text-fg-muted inline-flex items-center gap-0.5 mt-1 hover:text-accent"
              >
                {s.url.slice(0, 40)}{s.url.length > 40 && "…"} <ExternalLink size={9} />
              </a>
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div>
          {status === "idle" && (
            <button onClick={load} className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-900 dark:text-purple-100 border border-purple-500/40 inline-flex items-center gap-1">
              <Download size={11} /> 載入 Python
            </button>
          )}
          {status === "loading" && <span className="text-fg-muted inline-flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> {progress}</span>}
          {status === "ready" && <span className="text-emerald-400">● Python ready</span>}
          {status === "error" && <span className="text-red-400">⚠️ {error}</span>}
        </div>
        <div className="flex items-center gap-2">
          <AskAI code={code} error={stderr} lang="python" context="Scrape Lab" />
          <button
            onClick={execute}
            disabled={running || status !== "ready"}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold text-xs inline-flex items-center gap-1 disabled:opacity-50"
          >
            {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
            Run scraper
          </button>
        </div>
      </div>

      {/* Code editor + output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">📝 爬蟲 code</div>
          <CodeEditor value={code} onChange={setCode} onRun={execute} lang="python" storageKey="scrape-code" height="400px" minHeight="400px" />
        </div>
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">💬 結果</div>
          <div className="flex-1 min-h-[400px] p-3 bg-[#0d1117] overflow-y-auto font-mono text-xs leading-relaxed">
            {output && <pre className="whitespace-pre-wrap text-[#e6edf3]">{output}</pre>}
            {stderr && <pre className="whitespace-pre-wrap text-red-400 mt-2">{stderr}</pre>}
            {!output && !stderr && <span className="text-fg-muted/60">{"// 跑爬蟲後結果在這"}</span>}
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="rounded-xl bg-bg-elevated/30 border border-border p-3 text-[11px] text-fg-muted leading-relaxed">
        <div className="font-bold text-fg mb-1">💡 爬蟲練習守則</div>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>所有 HTTP 請求走後端 proxy <code>/api/admin/playground/scrape</code>（admin only、有 rate limit）</li>
          <li>禁止爬政府網站 / 個資 / 違法內容、Cloudflare 會被擋</li>
          <li>本站爬不會被擋、但勿濫用（一天上限 100 次 / admin）</li>
          <li>解析 HTML 用 <code>re</code> module 即可、不裝 BeautifulSoup4（檔太大）</li>
        </ul>
      </div>
    </div>
  );
}
