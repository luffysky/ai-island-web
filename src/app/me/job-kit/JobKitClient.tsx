"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Download, Copy, Printer, Sparkles, IdCard, Mic, FileText, Mail, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

// markdown → HTML（標題/列表/粗體/連結，XSS 安全）— 對齊 ResumeClient
function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3 class='font-bold text-base mt-4 mb-1'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class='font-bold text-lg mt-5 mb-2 border-b border-border pb-1'>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class='font-extrabold text-2xl mb-1'>$1</h1>")
    .replace(/^&gt; (.+)$/gm, "<blockquote class='border-l-2 border-accent-2 pl-3 italic text-fg-muted my-2'>$1</blockquote>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((.+?)\)/g, (_m, text, url) => {
      const u = String(url).trim();
      const safe = /^(https?:\/\/|mailto:|\/)/i.test(u) ? u.replace(/"/g, "%22").replace(/'/g, "%27") : "#";
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">${text}</a>`;
    })
    .replace(/^- (.+)$/gm, "<li class='ml-5 list-disc my-0.5'>$1</li>")
    .replace(/\n\n/g, "<br/>");
}

function DocActions({ md, model, filename }: { md: string; model: string; filename: string }) {
  const toast = useToast();
  const download = () => {
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.md`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border print:hidden">
      <button onClick={() => navigator.clipboard.writeText(md).then(() => toast.success("已複製"))} className="btn-chip btn-chip-info"><Copy size={12} /> 複製</button>
      <button onClick={download} className="btn-chip btn-chip-info"><Download size={12} /> 下載 .md</button>
      <button onClick={() => window.print()} className="btn-chip btn-chip-info"><Printer size={12} /> 印 PDF</button>
      {model && <span className="text-xs text-fg-muted ml-auto self-center">by {model}</span>}
    </div>
  );
}

function DocPreview({ md }: { md: string }) {
  if (!md) return null;
  return (
    <article className="bg-bg-card border border-border rounded-xl p-6 md:p-8 mt-3 prose dark:prose-invert max-w-none print:border-0 print:p-0 print:bg-white print:text-black">
      <div className="jobkit-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }} />
    </article>
  );
}

// ── 自傳 ───────────────────────────────
function BioPanel() {
  const [focus, setFocus] = useState("");
  const [md, setMd] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);

  const gen = async () => {
    setLoading(true); setMd("");
    try {
      const r = await fetch("/api/me/job-kit/bio", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focus: focus.trim() || undefined }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 429) setMd(`❌ ${j.reason || "本月自傳額度用完了，升級 Premium 無限使用。"}`);
      else if (j.markdown) { setMd(j.markdown); setModel(j.model ?? ""); }
      else setMd(`❌ ${j.error ?? "產生失敗"}`);
    } catch { setMd("❌ 網路不順，再試一次"); } finally { setLoading(false); }
  };

  return (
    <section className="bg-bg-card border border-border rounded-xl p-4 mb-4">
      <h2 className="font-bold flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-accent" /> 自傳 / 自我介紹</h2>
      <p className="text-xs text-fg-muted mb-3">依你的學習與作品資料生成，約 400–600 字。免費每月 3 次。</p>
      <textarea value={focus} onChange={(e) => setFocus(e.target.value.slice(0, 500))} rows={2}
        placeholder="想特別強調的方向？（選填，例：想轉職前端、擅長自學）"
        className="w-full px-3 py-2 rounded-lg border border-border bg-bg-elevated text-sm mb-2 resize-y print:hidden" />
      <button onClick={gen} disabled={loading} className="btn-chip btn-chip-success w-full justify-center py-2.5 text-sm font-bold disabled:opacity-50 print:hidden">
        {loading ? <><Loader2 size={14} className="animate-spin" /> 撰寫中…</> : <><Sparkles size={14} /> 生成自傳</>}
      </button>
      {md && <DocActions md={md} model={model} filename="ai-island-bio" />}
      <DocPreview md={md} />
    </section>
  );
}

// ── 求職信 ─────────────────────────────
function CoverLetterPanel() {
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jd, setJd] = useState("");
  const [highlights, setHighlights] = useState("");
  const [md, setMd] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);

  const gen = async () => {
    if (!company.trim() || !jobTitle.trim()) { setMd("❌ 請先填公司名稱和應徵職位"); return; }
    setLoading(true); setMd("");
    try {
      const r = await fetch("/api/me/job-kit/cover-letter", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: company.trim(), jobTitle: jobTitle.trim(), jd: jd.trim() || undefined, highlights: highlights.trim() || undefined }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 429) setMd(`❌ ${j.reason || "本月求職信額度用完了，升級 Premium 無限使用。"}`);
      else if (j.markdown) { setMd(j.markdown); setModel(j.model ?? ""); }
      else setMd(`❌ ${j.message || j.error || "產生失敗"}`);
    } catch { setMd("❌ 網路不順，再試一次"); } finally { setLoading(false); }
  };

  const field = "w-full px-3 py-2 rounded-lg border border-border bg-bg-elevated text-sm print:hidden";
  return (
    <section className="bg-bg-card border border-border rounded-xl p-4 mb-4">
      <h2 className="font-bold flex items-center gap-2 mb-1"><Mail className="w-4 h-4 text-accent" /> 求職信 / Cover Letter</h2>
      <p className="text-xs text-fg-muted mb-3">針對「這家公司這個職位」客製，約 300–450 字。免費每月 3 次。</p>
      <div className="grid sm:grid-cols-2 gap-2 mb-2">
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="公司名稱 *" className={field} />
        <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="應徵職位 *" className={field} />
      </div>
      <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={2} placeholder="職缺描述 / 要求（選填，貼上 JD 效果更好）" className={`${field} mb-2 resize-y`} />
      <textarea value={highlights} onChange={(e) => setHighlights(e.target.value)} rows={2} placeholder="想強調的亮點（選填，例：做過類似專案、相關經驗）" className={`${field} mb-2 resize-y`} />
      <button onClick={gen} disabled={loading} className="btn-chip btn-chip-success w-full justify-center py-2.5 text-sm font-bold disabled:opacity-50 print:hidden">
        {loading ? <><Loader2 size={14} className="animate-spin" /> 撰寫中…</> : <><Sparkles size={14} /> 生成求職信</>}
      </button>
      {md && <DocActions md={md} model={model} filename="ai-island-cover-letter" />}
      <DocPreview md={md} />
    </section>
  );
}

export function JobKitClient() {
  return (
    <div>
      {/* 既有工具入口 */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <Link href="/me/resume" className="bg-bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-accent/50 transition">
          <IdCard className="w-6 h-6 text-accent shrink-0" />
          <div className="flex-1 min-w-0"><div className="font-semibold">AI 履歷</div><div className="text-xs text-fg-muted">依學習資料自動生成</div></div>
          <ArrowRight className="w-4 h-4 text-fg-muted" />
        </Link>
        <Link href="/me/mock-interview" className="bg-bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-accent/50 transition">
          <Mic className="w-6 h-6 text-accent shrink-0" />
          <div className="flex-1 min-w-0"><div className="font-semibold">AI 模擬面試</div><div className="text-xs text-fg-muted">AI 面試官出題＋回饋報告</div></div>
          <ArrowRight className="w-4 h-4 text-fg-muted" />
        </Link>
      </div>

      {/* 兩個文件產生器 */}
      <BioPanel />
      <CoverLetterPanel />

      <p className="text-center text-xs text-fg-muted mt-2">內容依你的真實學習資料生成、僅供參考；送出前請自己再讀一遍、補上細節。</p>

      <style jsx global>{`
        @media print {
          body { background: white; color: black; }
          aside, nav, header, footer, button { display: none !important; }
          .jobkit-content h1, .jobkit-content h2, .jobkit-content h3 { color: black !important; }
        }
        .jobkit-content ul, .jobkit-content li { padding-left: 0; }
      `}</style>
    </div>
  );
}
