"use client";

import { useState } from "react";
import { Play, Loader2, Globe, ExternalLink, Download } from "lucide-react";
import { usePyodide } from "@/hooks/usePyodide";

const PRESET_SITES = [
  {
    name: "🏝️ AI 島本站 chapters",
    url: "/chapters",
    note: "練習：抓本站所有章節標題 + 副標",
    code: `# 爬 AI 島本站 chapters 頁面、找章節卡標題
import json
from js import fetch, console

# 透過後端 proxy 爬 (admin only)
resp = await fetch("/api/admin/playground/scrape?url=" + encodeURIComponent("/chapters"))
data = await resp.json()
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
data = await resp.json()
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
import re
from js import fetch
resp = await fetch("/api/admin/playground/scrape?url=" + encodeURIComponent("https://quotes.toscrape.com"))
data = await resp.json()
html = data["body"]

quotes = re.findall(r'<div class="quote">(.*?)</div>\\s*</div>', html, re.S)
print(f"找到 {len(quotes)} 句名言\\n")
for i, q in enumerate(quotes[:5], 1):
    text_m = re.search(r'<span class="text"[^>]*>([^<]+)</span>', q)
    author_m = re.search(r'<small class="author"[^>]*>([^<]+)</small>', q)
    if text_m and author_m:
        print(f"{i}. {text_m.group(1)[:80]}")
        print(f"   — {author_m.group(1)}\\n")
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
data = await resp.json()
import json
ids = json.loads(data["body"])[:10]
print(f"前 10 篇熱門 ID：{ids}\\n")

# 依次拿每篇詳情
for i, story_id in enumerate(ids, 1):
    r = await fetch(f"/api/admin/playground/scrape?url=" + encodeURIComponent(f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json"))
    d = await r.json()
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
from js import fetch

url = "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=Taiwan&format=json&srlimit=5"
resp = await fetch("/api/admin/playground/scrape?url=" + encodeURIComponent(url))
data = await resp.json()
result = json.loads(data["body"])

for i, item in enumerate(result["query"]["search"], 1):
    print(f"{i}. {item['title']}")
    snippet = item['snippet'].replace('<span class="searchmatch">', '').replace('</span>', '')
    print(f"   {snippet[:100]}...\\n")
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
            <button onClick={load} className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 inline-flex items-center gap-1">
              <Download size={11} /> 載入 Python
            </button>
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
          Run scraper
        </button>
      </div>

      {/* Code editor + output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">📝 爬蟲 code</div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                execute();
              }
            }}
            spellCheck={false}
            className="w-full bg-[#0d1117] text-[#e6edf3] font-mono text-xs p-3 outline-none border-0 resize-y min-h-[400px] leading-relaxed"
            style={{ tabSize: 4 }}
          />
        </div>
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">💬 結果</div>
          <div className="flex-1 min-h-[400px] p-3 bg-[#0d1117] overflow-y-auto font-mono text-xs leading-relaxed">
            {output && <pre className="whitespace-pre-wrap text-[#e6edf3]">{output}</pre>}
            {stderr && <pre className="whitespace-pre-wrap text-red-400 mt-2">{stderr}</pre>}
            {!output && !stderr && <span className="text-fg-muted/60">// 跑爬蟲後結果在這</span>}
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
