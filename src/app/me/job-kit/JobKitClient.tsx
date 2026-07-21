"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("jobKit");
  const download = () => {
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.md`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border print:hidden">
      <button onClick={() => navigator.clipboard.writeText(md).then(() => toast.success(t("actions.copied")))} className="btn-chip btn-chip-info"><Copy size={12} /> {t("actions.copy")}</button>
      <button onClick={download} className="btn-chip btn-chip-info"><Download size={12} /> {t("actions.download")}</button>
      <button onClick={() => window.print()} className="btn-chip btn-chip-info"><Printer size={12} /> {t("actions.printPdf")}</button>
      {model && <span className="text-xs text-fg-muted ml-auto self-center">{t("actions.byModel", { model })}</span>}
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
  const t = useTranslations("jobKit");
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
      if (r.status === 429) setMd(`❌ ${j.reason || t("errors.bioQuota")}`);
      else if (j.markdown) { setMd(j.markdown); setModel(j.model ?? ""); }
      else setMd(`❌ ${j.error ?? t("errors.genFailed")}`);
    } catch { setMd(`❌ ${t("errors.network")}`); } finally { setLoading(false); }
  };

  return (
    <section className="bg-bg-card border border-border rounded-xl p-4 mb-4">
      <h2 className="font-bold flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-accent" /> {t("bio.title")}</h2>
      <p className="text-xs text-fg-muted mb-3">{t("bio.desc")}</p>
      <textarea value={focus} onChange={(e) => setFocus(e.target.value.slice(0, 500))} rows={2}
        placeholder={t("bio.focusPlaceholder")}
        className="w-full px-3 py-2 rounded-lg border border-border bg-bg-elevated text-sm mb-2 resize-y print:hidden" />
      <button onClick={gen} disabled={loading} className="btn-chip btn-chip-success w-full justify-center py-2.5 text-sm font-bold disabled:opacity-50 print:hidden">
        {loading ? <><Loader2 size={14} className="animate-spin" /> {t("common.writing")}</> : <><Sparkles size={14} /> {t("bio.generate")}</>}
      </button>
      {md && <DocActions md={md} model={model} filename="ai-island-bio" />}
      <DocPreview md={md} />
    </section>
  );
}

// ── 求職信 ─────────────────────────────
function CoverLetterPanel() {
  const t = useTranslations("jobKit");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jd, setJd] = useState("");
  const [highlights, setHighlights] = useState("");
  const [md, setMd] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);

  const gen = async () => {
    if (!company.trim() || !jobTitle.trim()) { setMd(`❌ ${t("errors.coverRequired")}`); return; }
    setLoading(true); setMd("");
    try {
      const r = await fetch("/api/me/job-kit/cover-letter", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: company.trim(), jobTitle: jobTitle.trim(), jd: jd.trim() || undefined, highlights: highlights.trim() || undefined }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 429) setMd(`❌ ${j.reason || t("errors.coverQuota")}`);
      else if (j.markdown) { setMd(j.markdown); setModel(j.model ?? ""); }
      else setMd(`❌ ${j.message || j.error || t("errors.genFailed")}`);
    } catch { setMd(`❌ ${t("errors.network")}`); } finally { setLoading(false); }
  };

  const field = "w-full px-3 py-2 rounded-lg border border-border bg-bg-elevated text-sm print:hidden";
  return (
    <section className="bg-bg-card border border-border rounded-xl p-4 mb-4">
      <h2 className="font-bold flex items-center gap-2 mb-1"><Mail className="w-4 h-4 text-accent" /> {t("coverLetter.title")}</h2>
      <p className="text-xs text-fg-muted mb-3">{t("coverLetter.desc")}</p>
      <div className="grid sm:grid-cols-2 gap-2 mb-2">
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t("coverLetter.companyPlaceholder")} className={field} />
        <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder={t("coverLetter.jobTitlePlaceholder")} className={field} />
      </div>
      <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={2} placeholder={t("coverLetter.jdPlaceholder")} className={`${field} mb-2 resize-y`} />
      <textarea value={highlights} onChange={(e) => setHighlights(e.target.value)} rows={2} placeholder={t("coverLetter.highlightsPlaceholder")} className={`${field} mb-2 resize-y`} />
      <button onClick={gen} disabled={loading} className="btn-chip btn-chip-success w-full justify-center py-2.5 text-sm font-bold disabled:opacity-50 print:hidden">
        {loading ? <><Loader2 size={14} className="animate-spin" /> {t("common.writing")}</> : <><Sparkles size={14} /> {t("coverLetter.generate")}</>}
      </button>
      {md && <DocActions md={md} model={model} filename="ai-island-cover-letter" />}
      <DocPreview md={md} />
    </section>
  );
}

export function JobKitClient() {
  const t = useTranslations("jobKit");
  return (
    <div>
      {/* 既有工具入口 */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <Link href="/me/resume" className="bg-bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-accent/50 transition">
          <IdCard className="w-6 h-6 text-accent shrink-0" />
          <div className="flex-1 min-w-0"><div className="font-semibold">{t("tools.resumeTitle")}</div><div className="text-xs text-fg-muted">{t("tools.resumeDesc")}</div></div>
          <ArrowRight className="w-4 h-4 text-fg-muted" />
        </Link>
        <Link href="/me/mock-interview" className="bg-bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-accent/50 transition">
          <Mic className="w-6 h-6 text-accent shrink-0" />
          <div className="flex-1 min-w-0"><div className="font-semibold">{t("tools.mockTitle")}</div><div className="text-xs text-fg-muted">{t("tools.mockDesc")}</div></div>
          <ArrowRight className="w-4 h-4 text-fg-muted" />
        </Link>
      </div>

      {/* 兩個文件產生器 */}
      <BioPanel />
      <CoverLetterPanel />

      <p className="text-center text-xs text-fg-muted mt-2">{t("meta.footnote")}</p>

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
