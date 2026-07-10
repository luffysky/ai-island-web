"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, FileText, Trophy, Rocket, CheckCircle2, Loader2, Heart, ChevronRight, List } from "lucide-react";

type GrantDoc = { slug: string; file: string; title: string; markdown: string };

// 依 slug 分組 + 給可愛 emoji / 短名
function metaFor(slug: string): { group: string; emoji: string; short: string } {
  if (/^ch[0-9]/.test(slug)) {
    const n = slug.match(/^ch(\d+)/)?.[1] ?? "";
    const names: Record<string, string> = {
      "0": "現況口徑", "1": "執行摘要", "2": "市場痛點", "3": "產品介紹", "4": "技術架構",
      "5": "商業模式", "6": "成本財務", "7": "競品分析", "8": "經費運用", "9": "KPI 指標",
    };
    return { group: "📋 計畫書九章", emoji: n === "0" ? "🧭" : "📄", short: `第${n}章 ${names[n] ?? ""}` };
  }
  if (slug === "full-plan") return { group: "📖 完整版", emoji: "📕", short: "完整合併版（全文）" };
  if (slug === "tech-inventory") return { group: "🔧 技術盤點", emoji: "🔬", short: "技術全盤點" };
  if (slug.startsWith("pitch-deck-en")) return { group: "🏆 競賽", emoji: "🌏", short: "Pitch Deck（English）" };
  if (slug.startsWith("pitch-deck")) return { group: "🏆 競賽", emoji: "🎤", short: "Pitch 骨架（中文）" };
  if (slug === "competition-onepager") return { group: "🏆 競賽", emoji: "📃", short: "一頁式報名摘要" };
  if (slug === "business-registration-checklist") return { group: "✅ 行動清單", emoji: "🏪", short: "獨資商號登記清單" };
  if (slug === "swot") return { group: "📋 計畫書九章", emoji: "🎯", short: "SWOT 分析" };
  if (slug === "creator-island") return { group: "📋 計畫書九章", emoji: "🎨", short: "創作者島嶼（亮點）" };
  return { group: "📁 其他", emoji: "📄", short: slug };
}

const GROUP_ORDER = ["📋 計畫書九章", "🏆 競賽", "✅ 行動清單", "🔧 技術盤點", "📖 完整版", "📁 其他"];

// 用「原始碼行號」當節點 id → 唯一、與 markdown 標題一一對應（strict mode 也不會錯位）。
const headingId = (line?: number) => `grant-h-${line ?? 0}`;

// 從 markdown 掃出 h1~h3 目錄節點（記行號，跟渲染出的標題 id 對得起來）。
// 跳過：第一行的文件大標題（已在頁首顯示）、手寫的「目錄」段。
function buildToc(markdown: string): { level: number; text: string; line: number }[] {
  const out: { level: number; text: string; line: number }[] = [];
  const lines = markdown.split("\n");
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (/^\s*```/.test(raw)) { inFence = !inFence; continue; } // 跳過程式碼區塊裡的 #
    if (inFence) continue;
    const m = /^(#{1,3})\s+(.+?)\s*#*$/.exec(raw);
    if (!m) continue;
    const text = m[2].replace(/[*_`]/g, "").trim();
    if (i === 0) continue;             // 文件大標題（頁首已顯示）
    if (/^目錄$/.test(text)) continue; // 文件自帶的手寫目錄段
    out.push({ level: m[1].length, text, line: i + 1 });
  }
  return out;
}

export function GrantHubClient() {
  const [docs, setDocs] = useState<GrantDoc[] | null>(null);
  const [active, setActive] = useState<string>("ch1-executive-summary");
  const [err, setErr] = useState("");
  const contentRef = useRef<HTMLElement | null>(null);

  // 選文件：手機版（單欄）自動捲到內容區，不用再手動往下滑。
  const openDoc = (slug: string) => {
    setActive(slug);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      requestAnimationFrame(() => contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  // 點目錄節點：平滑捲到該標題（扣掉 sticky header 高度）。
  const jumpTo = (line: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(headingId(line))?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    fetch("/api/admin/grant", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d.docs) setDocs(d.docs); else setErr(d.error ?? "load_failed"); })
      .catch(() => setErr("network_error"));
  }, []);

  const grouped = useMemo(() => {
    const g: Record<string, GrantDoc[]> = {};
    (docs ?? []).forEach((d) => { const m = metaFor(d.slug); (g[m.group] ??= []).push(d); });
    Object.values(g).forEach((arr) => arr.sort((a, b) => a.slug.localeCompare(b.slug)));
    return g;
  }, [docs]);

  const current = docs?.find((d) => d.slug === active) ?? docs?.[0];
  const chapters = (docs ?? []).filter((d) => /^ch[1-9]/.test(d.slug)).length;
  const toc = useMemo(() => (current ? buildToc(current.markdown) : []), [current]);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-xl"
        style={{ background: "linear-gradient(135deg,#10b981 0%,#14b8a6 45%,#0ea5e9 100%)" }}>
        <div className="absolute -right-6 -top-6 text-[120px] opacity-20 select-none">🏆</div>
        <div className="absolute right-24 top-8 animate-pulse"><Sparkles size={22} className="opacity-70" /></div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 text-xs font-semibold bg-white/20 backdrop-blur px-3 py-1 rounded-full mb-3">
            <span className="text-lg">🐹</span> 綠寶的補助作戰室
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">補助 &amp; 競賽 作戰計畫</h1>
          <p className="mt-2 text-white/85 text-sm max-w-2xl">
            AI 島邁向政府補助與創業競賽的完整企劃書、競賽 pitch、行動清單，全都在這裡 ✨
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full"><FileText size={13} /> {docs?.length ?? "…"} 份文件</span>
            <span className="inline-flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full"><CheckCircle2 size={13} /> 計畫書 {chapters} 章</span>
            <span className="inline-flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full"><Trophy size={13} /> 主攻 TSWC 競賽</span>
            <span className="inline-flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full"><Rocket size={13} /> 目標 DIGITAL+ 補助</span>
          </div>
        </div>
      </div>

      {err && <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300 p-4 text-sm">讀取失敗：{err}</div>}
      {!docs && !err && (
        <div className="flex items-center justify-center gap-2 text-fg-muted py-16"><Loader2 className="animate-spin" size={18} /> 載入作戰計畫中…</div>
      )}

      {docs && (
        <div className="grid lg:grid-cols-[280px_1fr] gap-5">
          {/* 左：文件清單 */}
          <aside className="lg:sticky lg:top-4 lg:self-start space-y-4 lg:max-h-[80vh] lg:overflow-y-auto pr-1">
            {GROUP_ORDER.filter((g) => grouped[g]?.length).map((group) => (
              <div key={group}>
                <div className="text-xs font-bold text-fg-muted px-1 mb-1.5">{group}</div>
                <div className="space-y-1">
                  {grouped[group].map((d) => {
                    const m = metaFor(d.slug);
                    const on = active === d.slug;
                    return (
                      <button key={d.slug} onClick={() => openDoc(d.slug)}
                        className={`w-full text-left rounded-xl px-3 py-2 text-sm flex items-center gap-2 transition ${
                          on ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md font-semibold"
                             : "hover:bg-bg-elevated text-fg"}`}>
                        <span className="text-base shrink-0">{m.emoji}</span>
                        <span className="flex-1 min-w-0 truncate">{m.short}</span>
                        {on && <ChevronRight size={15} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>

          {/* 右：內容 */}
          <main ref={contentRef} className="min-w-0 scroll-mt-4">
            <div className="rounded-3xl border border-border bg-bg-card shadow-sm overflow-hidden">
              <div className="px-5 sm:px-7 py-4 border-b border-border bg-gradient-to-r from-emerald-500/[0.08] to-sky-500/[0.06] flex items-center gap-2">
                <span className="text-xl">{current ? metaFor(current.slug).emoji : "📄"}</span>
                <div className="font-bold truncate">{current?.title}</div>
              </div>

              {/* 目錄節點：文件超過 3 個小標題就顯示，點了平滑捲到該段 */}
              {toc.length >= 3 && (
                <details open={toc.length <= 20} className="border-b border-border bg-bg-elevated/40 px-5 sm:px-7 py-3">
                  <summary className="cursor-pointer select-none text-sm font-bold text-fg-muted inline-flex items-center gap-1.5">
                    <List size={15} className="text-emerald-500" /> 目錄（{toc.length} 節）
                  </summary>
                  <nav className="mt-2 space-y-0.5 max-h-[60vh] overflow-y-auto">
                    {toc.map((h) => (
                      <a
                        key={h.line}
                        href={`#${headingId(h.line)}`}
                        onClick={jumpTo(h.line)}
                        className={`block rounded-lg px-2 py-1 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition truncate ${
                          h.level === 1 ? "text-sm font-bold text-fg mt-1"
                          : h.level === 2 ? "pl-4 text-sm text-fg-muted font-medium"
                          : "pl-8 text-[13px] text-fg-muted"
                        }`}
                      >
                        {h.level === 3 ? "· " : ""}{h.text}
                      </a>
                    ))}
                  </nav>
                </details>
              )}

              <article className="prose-custom max-w-none px-5 sm:px-7 py-6 text-[15px] leading-relaxed">
                {current && (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ node, children }) => <h1 id={headingId(node?.position?.start?.line)} className="scroll-mt-20">{children}</h1>,
                      h2: ({ node, children }) => <h2 id={headingId(node?.position?.start?.line)} className="scroll-mt-20">{children}</h2>,
                      h3: ({ node, children }) => <h3 id={headingId(node?.position?.start?.line)} className="scroll-mt-20">{children}</h3>,
                    }}
                  >
                    {current.markdown}
                  </ReactMarkdown>
                )}
              </article>
            </div>
            <div className="text-center text-sm text-fg-muted py-6 inline-flex w-full items-center justify-center gap-1.5">
              AI 島 · 補助 &amp; 競賽作戰計畫 <Heart size={14} className="text-emerald-500 fill-emerald-500" />
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
