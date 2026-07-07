"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Copy, Music, Film, Link2, Sparkles, ExternalLink, Globe } from "lucide-react";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useTranslations } from "next-intl";

type Work = { id: string; title: string; body: string; work_type: string; status: string; meta: any; published_blog_id: string | null; is_showcased?: boolean };

async function api(url: string, body?: any) {
  const res = await fetch(url, { method: "POST", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message || j.error || `HTTP ${res.status}`);
  return j;
}
async function patch(url: string, body: any) {
  const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message || j.error || `HTTP ${res.status}`);
  return j;
}

export function WorkEditor({ work, canEdit, usedFragments = [], derivedCount = 0 }: { work: Work; canEdit: boolean; usedFragments?: { id: string; title: string }[]; derivedCount?: number }) {
  const t = useTranslations("creator");
  const [title, setTitle] = useState(work.title);
  const [body, setBody] = useState(work.body);
  const [status, setStatus] = useState(work.status);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [seoLink, setSeoLink] = useState<string | null>(null);
  const [showcased, setShowcased] = useState(!!work.is_showcased);
  const confirm = useConfirm();
  const meta = work.meta || {};

  async function toggleShowcase() {
    setBusy("showcase"); setErr(null); setMsg(null);
    try {
      const r = await api(`/api/creator-island/works/${work.id}/showcase`, { on: !showcased });
      setShowcased(r.on);
      setMsg(r.on ? `${t("worksShowcaseOn")} 🎨` : t("worksShowcaseOff"));
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  function copy(text: string, label: string) {
    navigator.clipboard?.writeText(text).then(() => { setMsg(t("worksCopied", { label })); setTimeout(() => setMsg(null), 1500); }, () => setErr(t("worksCopyFail")));
  }

  async function save() {
    setBusy("save"); setErr(null); setMsg(null);
    try { await patch(`/api/creator-island/works/${work.id}`, { title, body, status }); setMsg(t("worksSaved")); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function publish() {
    setBusy("publish"); setErr(null); setMsg(null);
    try { await api(`/api/creator-island/works/${work.id}/publish`); setMsg(t("worksPublishedDraft")); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function toSeo() {
    setBusy("seo"); setErr(null); setMsg(null); setSeoLink(null);
    try {
      const r = await api(`/api/creator-island/works/${work.id}/to-seo`);
      setMsg(t("worksSeoDone"));
      setSeoLink(r.editUrl || `/me/blog/edit/${r.articleId}`);
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function archive() {
    if (!(await confirm({ title: t("worksArchiveConfirm"), confirmLabel: t("worksArchiveConfirmLabel"), destructive: true }))) return;
    setBusy("archive"); setErr(null);
    try { const r = await api(`/api/creator-island/works/${work.id}/archive`); setMsg(t("worksArchived", { n: r.recycled })); setStatus("archived"); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/creator-island/works" className="text-sm text-accent hover:underline inline-flex items-center gap-1.5"><ArrowLeft size={14} /> {t("worksBackToLibrary")}</Link>
        <div className="flex gap-2 text-sm">
          {canEdit && <button onClick={save} disabled={busy !== null} className="px-3 py-1.5 rounded-full bg-accent text-white disabled:opacity-40">{busy === "save" ? "…" : t("worksSave")}</button>}
          {canEdit && work.work_type === "article" && <button onClick={publish} disabled={busy !== null} className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 disabled:opacity-40">{t("worksPublishArticle")}</button>}
          {canEdit && <button onClick={toggleShowcase} disabled={busy !== null} className={`px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 disabled:opacity-40 ${showcased ? "bg-accent/20 text-accent" : "bg-bg-elevated hover:text-accent"}`}><Globe size={14} /> {busy === "showcase" ? "…" : showcased ? t("worksShowcasing") : t("worksPublishToShowcase")}</button>}
          {canEdit && <button onClick={toSeo} disabled={busy !== null} className="px-3 py-1.5 rounded-full bg-violet-500/20 text-violet-300 disabled:opacity-40 inline-flex items-center gap-1.5"><Sparkles size={14} /> {busy === "seo" ? t("worksSeoGenerating") : t("worksToSeo")}</button>}
          {canEdit && status !== "archived" && <button onClick={archive} disabled={busy !== null} className="px-3 py-1.5 rounded-full bg-bg-elevated disabled:opacity-40">{t("worksArchiveRecycle")}</button>}
        </div>
      </div>
      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-2 text-sm">⚠️ {err}</div>}
      {msg && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-2 text-sm">✅ {msg}</div>}
      {seoLink && <Link href={seoLink} className="bg-violet-500/10 border border-violet-500/30 text-violet-300 rounded-xl px-4 py-2 text-sm inline-flex items-center gap-1.5 hover:underline"><ExternalLink size={14} /> {t("worksOpenSeoDraft")}</Link>}

      <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit}
        className="w-full bg-transparent text-2xl font-bold outline-none border-b border-border pb-2" />
      <div className="flex items-center gap-2 text-xs text-fg-muted">
        <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300">{work.work_type}</span>
        {canEdit && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-bg-elevated border border-border rounded-full px-2 py-0.5">
            <option value="draft">{t("worksStatusDraft")}</option><option value="in_progress">{t("worksStatusInProgress")}</option><option value="done">{t("worksStatusDone")}</option><option value="archived">{t("worksStatusArchived")}</option>
          </select>
        )}
      </div>
      <BlogEditor content={body} onChange={setBody} editable={canEdit} placeholder={work.work_type === "song" ? t("worksLyricsPlaceholder") : t("worksContentPlaceholder")} />

      <div className="flex flex-wrap gap-2">
        <button onClick={() => copy(body, work.work_type === "song" ? t("worksLabelLyrics") : t("worksLabelContent"))} className="text-xs px-3 py-1.5 rounded-full bg-bg-elevated hover:text-accent inline-flex items-center gap-1.5"><Copy size={14} /> {work.work_type === "song" ? t("worksCopyLyrics") : t("worksCopyContent")}</button>
        {meta.sunoPrompt && <button onClick={() => copy(meta.sunoPrompt, t("worksLabelSuno"))} className="text-xs px-3 py-1.5 rounded-full bg-bg-elevated hover:text-accent inline-flex items-center gap-1.5"><Copy size={14} /> {t("worksCopySuno")}</button>}
        {meta.mvPrompt && <button onClick={() => copy(meta.mvPrompt, t("worksLabelMv"))} className="text-xs px-3 py-1.5 rounded-full bg-bg-elevated hover:text-accent inline-flex items-center gap-1.5"><Copy size={14} /> {t("worksCopyMv")}</button>}
        {meta.sunoPrompt && <button onClick={() => copy(`${title}\n\n${body}\n\n— Suno —\n${meta.sunoPrompt}\n\n— MV —\n${meta.mvPrompt ?? ""}`, t("worksLabelAll"))} className="text-xs px-3 py-1.5 rounded-full bg-accent/15 text-accent inline-flex items-center gap-1.5"><Copy size={14} /> {t("worksCopyAll")}</button>}
      </div>
      {(meta.sunoPrompt || meta.mvPrompt) && (
        <div className="bg-bg-elevated rounded-xl p-3 text-xs space-y-1">
          {meta.sunoPrompt && <div><b className="inline-flex items-center gap-1.5"><Music size={14} /> {t("worksSunoHeading")}</b>{meta.sunoPrompt}</div>}
          {meta.mvPrompt && <div><b className="inline-flex items-center gap-1.5"><Film size={14} /> {t("worksMvHeading")}</b>{meta.mvPrompt}</div>}
        </div>
      )}

      {/* E3 創作家譜：這篇由哪些碎片長成 + 衍生數 */}
      {(usedFragments.length > 0 || derivedCount > 0) && (
        <div className="bg-bg-card border border-border rounded-xl p-3 text-xs space-y-1">
          <div className="font-bold text-fg-muted inline-flex items-center gap-1.5"><Link2 size={14} /> {t("worksLineage")}</div>
          {usedFragments.length > 0 && (
            <div>{t("worksLineageFromPre")}<b>{usedFragments.length}</b>{t("worksLineageFromPost")}{usedFragments.map((f) => f.title).join("、")}</div>
          )}
          {derivedCount > 0 && <div>{t("worksDerivedPre")}<b>{derivedCount}</b>{t("worksDerivedPost")}</div>}
        </div>
      )}
    </div>
  );
}
