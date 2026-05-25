import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { Hint } from "@/components/ui/Hint";
import { Zap, Eye, MousePointer2, Move, Gauge, Clock, AlertTriangle, TrendingDown } from "lucide-react";

export const dynamic = "force-dynamic";

type MetricStat = {
  metric: string;
  total: number;
  good: number;
  needsImprovement: number;
  poor: number;
  p50: number;
  p75: number;
  p95: number;
};

const METRIC_META: Record<string, {
  icon: any;
  fullName: string;
  zhName: string;
  description: string;
  unit: string;
  goodThreshold: number;
  needsThreshold: number;
  whatItMeans: string;
  howToFix: string;
}> = {
  LCP: {
    icon: Eye,
    fullName: "Largest Contentful Paint",
    zhName: "最大內容繪製",
    description: "頁面最大元素變得看得到的時間",
    unit: "ms",
    goodThreshold: 2500,
    needsThreshold: 4000,
    whatItMeans: "從用戶按下連結到他看見頁面主要內容（通常是大圖或標題）需要幾秒。簡單講：『等多久才看到內容』。",
    howToFix: "壓縮圖片、用 next/image、CDN、減少 server 慢回應。",
  },
  INP: {
    icon: MousePointer2,
    fullName: "Interaction to Next Paint",
    zhName: "互動回應時間",
    description: "用戶按下後、畫面真的有反應的時間",
    unit: "ms",
    goodThreshold: 200,
    needsThreshold: 500,
    whatItMeans: "用戶按按鈕、打字、點連結時、瀏覽器要花多久才回應。簡單講：『按下去之後卡多久才動』。",
    howToFix: "減少 JS bundle、避免長時間 main thread 阻塞、用 useTransition / requestIdleCallback。",
  },
  CLS: {
    icon: Move,
    fullName: "Cumulative Layout Shift",
    zhName: "版面累積位移",
    description: "頁面元素亂跳的程度（0 = 完美穩定）",
    unit: "",
    goodThreshold: 0.1,
    needsThreshold: 0.25,
    whatItMeans: "頁面載入時、元素會不會突然位移（例如圖片載完把按鈕擠下去、用戶手點到別的）。0 = 不會跳。簡單講：『畫面亂跳的程度』。",
    howToFix: "圖片給 width/height、廣告位先佔好空間、避免動態插入元素到 above-fold。",
  },
  FCP: {
    icon: Clock,
    fullName: "First Contentful Paint",
    zhName: "首次內容繪製",
    description: "頁面開始顯示任何東西的時間",
    unit: "ms",
    goodThreshold: 1800,
    needsThreshold: 3000,
    whatItMeans: "瀏覽器從收到 HTML 到第一個東西（文字或圖）出現在螢幕上的時間。簡單講：『開始有東西看的時間』。",
    howToFix: "減少 CSS 阻塞、preload 關鍵字體、減少 JS 在 head。",
  },
  TTFB: {
    icon: Zap,
    fullName: "Time to First Byte",
    zhName: "首位元組時間",
    description: "瀏覽器送出請求到收到 server 第一個 byte",
    unit: "ms",
    goodThreshold: 800,
    needsThreshold: 1800,
    whatItMeans: "瀏覽器送出請求、到 server 開始回傳資料之間的延遲。多半是 server / DB / CDN 的快慢。簡單講：『server 多快開始回答』。",
    howToFix: "用 CDN、edge cache、ISR、減少 DB query、選離 user 近的 region。",
  },
  FID: {
    icon: Gauge,
    fullName: "First Input Delay",
    zhName: "首次輸入延遲",
    description: "用戶第一次互動、瀏覽器多久處理（已被 INP 取代）",
    unit: "ms",
    goodThreshold: 100,
    needsThreshold: 300,
    whatItMeans: "用戶第一次點按鈕、瀏覽器多久才開始處理（不含畫面更新）。Google 2024 起改用 INP 取代、看 INP 就好。",
    howToFix: "同 INP — 減少 main thread 阻塞。",
  },
};

function percentile(sorted: number[], pct: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((pct / 100) * sorted.length));
  return sorted[idx];
}

function getMetricColor(metric: string, value: number): { color: string; ring: string; bg: string; label: string } {
  const meta = METRIC_META[metric];
  if (!meta) return { color: "text-fg", ring: "ring-border", bg: "bg-bg-card", label: "未分類" };
  if (value <= meta.goodThreshold) return { color: "text-emerald-400", ring: "ring-emerald-500/40", bg: "bg-emerald-500/5", label: "Good" };
  if (value <= meta.needsThreshold) return { color: "text-yellow-400", ring: "ring-yellow-500/40", bg: "bg-yellow-500/5", label: "Needs work" };
  return { color: "text-red-400", ring: "ring-red-500/40", bg: "bg-red-500/5", label: "Poor" };
}

export default async function AdminWebVitalsPage() {
  const admin = createSupabaseAdmin();
  const sevenAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { data: rows } = await admin
    .from("web_vitals")
    .select("metric, value, rating, page_path, device_type, recorded_at")
    .gte("recorded_at", sevenAgo)
    .order("recorded_at", { ascending: false })
    .limit(10000);

  const byMetric: Record<string, { values: number[]; ratings: Record<string, number> }> = {};
  for (const r of rows ?? []) {
    const m = (r as any).metric;
    const v = Number((r as any).value);
    const rating = (r as any).rating ?? "unknown";
    if (!byMetric[m]) byMetric[m] = { values: [], ratings: { good: 0, "needs-improvement": 0, poor: 0, unknown: 0 } };
    byMetric[m].values.push(v);
    byMetric[m].ratings[rating] = (byMetric[m].ratings[rating] ?? 0) + 1;
  }

  // 排序：依固定順序 LCP > INP > CLS > FCP > TTFB > FID
  const ORDER = ["LCP", "INP", "CLS", "FCP", "TTFB", "FID"];
  const stats: MetricStat[] = Object.entries(byMetric)
    .map(([metric, d]) => {
      const sorted = [...d.values].sort((a, b) => a - b);
      return {
        metric,
        total: d.values.length,
        good: d.ratings.good ?? 0,
        needsImprovement: d.ratings["needs-improvement"] ?? 0,
        poor: d.ratings.poor ?? 0,
        p50: percentile(sorted, 50),
        p75: percentile(sorted, 75),
        p95: percentile(sorted, 95),
      };
    })
    .sort((a, b) => {
      const ai = ORDER.indexOf(a.metric);
      const bi = ORDER.indexOf(b.metric);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });

  // 最慢的頁面 top 10
  const pagePoor: Record<string, number> = {};
  for (const r of rows ?? []) {
    if ((r as any).rating === "poor") {
      const p = (r as any).page_path || "(unknown)";
      pagePoor[p] = (pagePoor[p] ?? 0) + 1;
    }
  }
  const worstPages = Object.entries(pagePoor).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // 整體健康度
  const totalSample = stats.reduce((s, x) => s + x.total, 0);
  const totalGood = stats.reduce((s, x) => s + x.good, 0);
  const totalNeeds = stats.reduce((s, x) => s + x.needsImprovement, 0);
  const totalPoor = stats.reduce((s, x) => s + x.poor, 0);
  const overallGoodPct = totalSample > 0 ? Math.round((totalGood / totalSample) * 100) : 0;

  const fmt = (m: string, v: number) =>
    m === "CLS" ? v.toFixed(3) :
    (m === "LCP" || m === "INP" || m === "FCP" || m === "TTFB" || m === "FID") ? `${Math.round(v).toLocaleString()} ms` :
    v.toFixed(2);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="text-yellow-400" size={24} />
          Web Vitals
          <Hint title="Web Vitals（網頁速度指標）">
            Google 訂的 6 個指標、量化「網頁打開的快慢、互動順不順」。是 SEO 排名因素之一、也直接影響 user 體驗。
            業界主要看 p75（前 75% 用戶的體驗）。
          </Hint>
          <span className="text-sm font-normal text-fg-muted">近 7 天</span>
        </h1>
        <p className="text-sm text-fg-muted mt-1">
          前台用 <span className="inline-flex items-center">
            beacon
            <Hint title="Beacon（信標）">
              用 navigator.sendBeacon() 把指標傳到後端、不阻塞頁面、connection 斷了也會送出。
            </Hint>
          </span> 自動上報、共 <b className="text-fg">{rows?.length?.toLocaleString() ?? 0}</b> 筆樣本。
        </p>
      </header>

      {/* 整體分數卡 */}
      {totalSample > 0 && (
        <div className={`rounded-2xl border-2 p-5 ${overallGoodPct >= 90 ? "border-emerald-500/40 bg-emerald-500/5" : overallGoodPct >= 75 ? "border-yellow-500/40 bg-yellow-500/5" : "border-red-500/40 bg-red-500/5"}`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm text-fg-muted mb-1">整體健康度
                <Hint title="整體健康度">
                  全部指標、全部樣本裡、「good」等級佔的百分比。≥ 90% = 優、75-90% = 可、&lt; 75% = 要動工。
                </Hint>
              </div>
              <div className={`text-5xl font-extrabold ${overallGoodPct >= 90 ? "text-emerald-400" : overallGoodPct >= 75 ? "text-yellow-400" : "text-red-400"}`}>
                {overallGoodPct}%
              </div>
              <div className="text-xs text-fg-muted mt-1">{totalGood.toLocaleString()} good / {totalSample.toLocaleString()} 樣本</div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-bg-card border border-border rounded-xl p-3 min-w-20">
                <div className="text-xs text-fg-muted">Good</div>
                <div className="text-xl font-bold text-emerald-400">{totalGood.toLocaleString()}</div>
              </div>
              <div className="bg-bg-card border border-border rounded-xl p-3 min-w-20">
                <div className="text-xs text-fg-muted">Needs</div>
                <div className="text-xl font-bold text-yellow-400">{totalNeeds.toLocaleString()}</div>
              </div>
              <div className="bg-bg-card border border-border rounded-xl p-3 min-w-20">
                <div className="text-xs text-fg-muted">Poor</div>
                <div className="text-xl font-bold text-red-400">{totalPoor.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {stats.length === 0 ? (
        <div className="rounded-xl bg-bg-card border border-border p-12 text-center text-fg-muted">
          🍃 近 7 天還沒有 Web Vitals 資料、等使用者瀏覽幾分鐘就會進來。
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.map((s) => {
            const meta = METRIC_META[s.metric];
            const total = s.total || 1;
            const colorMeta = getMetricColor(s.metric, s.p75);
            const Icon = meta?.icon ?? Zap;
            const isDeprecated = s.metric === "FID";

            return (
              <article
                key={s.metric}
                className={`rounded-2xl border ring-1 transition hover:scale-[1.01] ${colorMeta.ring} ${colorMeta.bg} bg-bg-card p-4`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <Icon size={18} className={colorMeta.color} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-lg">{s.metric}</h3>
                        {isDeprecated && (
                          <span className="text-[9px] px-1 rounded bg-fg-muted/15 text-fg-muted">已停用</span>
                        )}
                        {meta && (
                          <Hint title={`${s.metric} - ${meta.zhName}`}>
                            <div className="mb-2"><b>{meta.fullName}</b></div>
                            <div className="mb-2">{meta.whatItMeans}</div>
                            <div className="text-fg-muted">
                              <b>怎麼修：</b>{meta.howToFix}
                            </div>
                          </Hint>
                        )}
                      </div>
                      {meta && <div className="text-[10px] text-fg-muted">{meta.zhName}</div>}
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${colorMeta.color} ${colorMeta.bg} border ${colorMeta.ring}`}>
                    {colorMeta.label}
                  </span>
                </div>

                {/* 主數字 */}
                <div className={`text-3xl font-extrabold ${colorMeta.color}`}>{fmt(s.metric, s.p75)}</div>
                <div className="text-[10px] text-fg-muted">
                  p75
                  <Hint title="p75（75 百分位數）">
                    把所有樣本從快到慢排、第 75 名的值。意思：『75% 的用戶比這數字快』。Google 推薦用 p75 評估 web vitals、因為涵蓋大多數用戶體驗、又能反映不在最差情況。
                  </Hint>
                  · 共 {s.total.toLocaleString()} 樣本
                </div>

                {/* 閾值線 */}
                {meta && (
                  <div className="mt-3 text-[10px] flex items-center justify-between text-fg-muted">
                    <span>
                      Good ≤ <b className="text-emerald-400">{meta.unit === "ms" ? Math.round(meta.goodThreshold).toLocaleString() + " ms" : meta.goodThreshold.toFixed(1)}</b>
                    </span>
                    <span>
                      Poor &gt; <b className="text-red-400">{meta.unit === "ms" ? Math.round(meta.needsThreshold).toLocaleString() + " ms" : meta.needsThreshold.toFixed(2)}</b>
                    </span>
                  </div>
                )}

                {/* p50 / p75 / p95 */}
                <div className="grid grid-cols-3 gap-1 mt-3">
                  <PctCell label="p50" value={fmt(s.metric, s.p50)} note="中位數" />
                  <PctCell label="p75" value={fmt(s.metric, s.p75)} note="業界用" highlight />
                  <PctCell label="p95" value={fmt(s.metric, s.p95)} note="極端" />
                </div>

                {/* 堆疊條 */}
                <div className="flex gap-px mt-3 h-2.5 rounded-full overflow-hidden bg-bg">
                  <div className="bg-emerald-500" style={{ width: `${(s.good / total) * 100}%` }} title={`good ${s.good}`} />
                  <div className="bg-yellow-500" style={{ width: `${(s.needsImprovement / total) * 100}%` }} title={`needs ${s.needsImprovement}`} />
                  <div className="bg-red-500" style={{ width: `${(s.poor / total) * 100}%` }} title={`poor ${s.poor}`} />
                </div>
                <div className="flex justify-between text-[10px] mt-1">
                  <span className="text-emerald-400 font-medium">●{Math.round((s.good / total) * 100)}%</span>
                  <span className="text-yellow-400 font-medium">●{Math.round((s.needsImprovement / total) * 100)}%</span>
                  <span className="text-red-400 font-medium">●{Math.round((s.poor / total) * 100)}%</span>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* 最慢的頁面 */}
      {worstPages.length > 0 && (
        <section className="rounded-2xl bg-bg-card border border-border p-5">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <TrendingDown size={16} className="text-red-400" /> 最慢的頁面
            <span className="text-xs font-normal text-fg-muted">— 7 天內出現 Poor 次數 Top 10</span>
            <Hint title="Poor 次數">
              該頁面被歸類為「Poor」(非常差) 的指標筆數加總。數字越大代表這頁的速度問題影響越多用戶。優先修這幾頁、收益最大。
            </Hint>
          </h2>
          <ul className="space-y-1 text-sm">
            {worstPages.map(([p, n], i) => {
              const max = worstPages[0][1];
              const widthPct = (n / max) * 100;
              return (
                <li key={p} className="relative flex justify-between items-center py-1.5 px-2 rounded hover:bg-bg-elevated">
                  <div className="absolute inset-0 bg-red-500/5 rounded" style={{ width: `${widthPct}%` }} />
                  <code className="relative text-xs text-fg truncate flex-1 mr-3">
                    <span className="text-fg-muted mr-2">#{i + 1}</span>
                    {p}
                  </code>
                  <span className="relative text-red-400 font-bold ml-2 inline-flex items-center gap-1">
                    <AlertTriangle size={11} />
                    {n}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Legend */}
      <section className="rounded-xl bg-bg-elevated/30 border border-border p-4 text-[11px] text-fg-muted">
        <div className="font-bold text-fg mb-2">📖 怎麼讀這頁</div>
        <ul className="space-y-1 list-disc list-inside">
          <li>每個指標 hover 問號 (?) 看詳細解釋 + 修法</li>
          <li>看「整體健康度」評估全站、≥ 90% 是業界優等</li>
          <li>p75 是 SEO 用的標準、p95 是極端情況 (慢機 / 弱網)</li>
          <li>下面「最慢的頁面」排序找出問題集中在哪、優先修這幾頁</li>
        </ul>
      </section>
    </div>
  );
}

function PctCell({ label, value, note, highlight }: { label: string; value: string; note: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-1.5 ${highlight ? "bg-accent/10 border border-accent/30" : "bg-bg"}`}>
      <div className="text-[9px] text-fg-muted">{label} ({note})</div>
      <div className={`text-sm font-bold ${highlight ? "text-accent" : "text-fg"}`}>{value}</div>
    </div>
  );
}
