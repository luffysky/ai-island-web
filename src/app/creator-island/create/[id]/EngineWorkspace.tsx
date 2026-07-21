"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Editor } from "@tiptap/react";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench, Lightbulb, Trees, X, Copy, ArrowDownToLine, Disc3, Library, Plus, FileText, Search, Users } from "lucide-react";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { IslandChat } from "../../IslandChat";
import { getType, type Tool } from "../engine-types";
import { useDraftCollab } from "@/lib/collab/use-draft-collab";
import { usePrompt, useConfirm } from "@/components/ui/ConfirmDialog";

type Fragment = { id: string; title: string; content: string; source_type: string };
type Draft = {
  id: string; workspace_id: string; work_type: string; title: string; body: string;
  doc: Record<string, unknown>; meta: Record<string, unknown>; fragment_ids: string[];
  status: string; published_work_id: string | null;
  series_id: string | null; series_order: number;
};

function htmlify(text: string): string {
  return text.split(/\n{2,}/).map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`).join("");
}

export function EngineWorkspace({ draft, fragments, currentUser }: { draft: Draft; fragments: Fragment[]; currentUser?: { id: string; name: string } }) {
  const tr = useTranslations("creator");
  const t = getType(draft.work_type);
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const [meta, setMeta] = useState<Record<string, unknown>>(draft.meta ?? {});
  const [fragIds, setFragIds] = useState<string[]>(draft.fragment_ids ?? []);
  const [save, setSave] = useState<"saved" | "saving" | "dirty">("saved");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [panel, setPanel] = useState<{ title: string; text: string } | null>(null);
  const [fragQ, setFragQ] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const first = useRef(true);
  const prompt = usePrompt();
  const confirm = useConfirm();

  // 即時共編（opt-in / 特性旗標 flag_collab）。realtime 失敗會優雅退回單人。
  const { collab, status: collabStatus, peers, seedEditor } = useDraftCollab({
    draftId: draft.id,
    user: currentUser ?? null,
    initialBody: draft.body,
  });

  // 系列/專輯（歌詞=專輯，其餘=系列）
  const seriesKind = draft.work_type === "song" ? "album" : "series";
  const seriesNoun = seriesKind === "album" ? tr("createAlbum") : tr("createSeries");
  const SeriesIcon = seriesKind === "album" ? Disc3 : Library;
  const [seriesList, setSeriesList] = useState<{ id: string; title: string; category: string }[]>([]);
  const [seriesId, setSeriesId] = useState<string | null>(draft.series_id ?? null);
  useEffect(() => {
    fetch(`/api/creator-island/series?workspaceId=${draft.workspace_id}&kind=${seriesKind}`)
      .then((r) => r.json()).then((j) => setSeriesList(j.items ?? [])).catch(() => {});
  }, [draft.workspace_id, seriesKind]);
  async function assignSeries(id: string | null) {
    setSeriesId(id);
    fetch(`/api/creator-island/drafts/${draft.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seriesId: id }) }).catch(() => {});
  }
  async function newSeries() {
    const title = await prompt({ title: tr("createNewSeriesNamePrompt", { noun: seriesNoun }) }); if (!title?.trim()) return;
    const category = (await prompt({ title: tr("createCategoryPrompt", { eg: seriesKind === "album" ? tr("createCategoryEgAlbum") : tr("createCategoryEgSeries") }) })) || "";
    try {
      const r = await fetch("/api/creator-island/series", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: draft.workspace_id, kind: seriesKind, title: title.trim(), category }) }).then((x) => x.json());
      if (r.series) { setSeriesList((p) => [r.series, ...p]); assignSeries(r.series.id); }
    } catch (e: any) { setErr(e.message); }
  }

  async function renameSeries() {
    const cur = seriesList.find((s) => s.id === seriesId); if (!cur) return;
    const title = await prompt({ title: tr("createNewSeriesNamePrompt", { noun: seriesNoun }), defaultValue: cur.title }); if (!title?.trim()) return;
    try {
      const r = await fetch(`/api/creator-island/series/${seriesId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim() }) }).then((x) => x.json());
      if (r.series) setSeriesList((p) => p.map((s) => (s.id === seriesId ? { ...s, title: title.trim() } : s)));
    } catch (e: any) { setErr(e.message); }
  }

  async function deleteSeries() {
    const cur = seriesList.find((s) => s.id === seriesId); if (!cur) return;
    if (!(await confirm({ title: `刪除「${cur.title}」？作品不會被刪、只是移出這個${seriesNoun}。`, destructive: true }))) return;
    try {
      await fetch(`/api/creator-island/series/${seriesId}`, { method: "DELETE" });
      setSeriesList((p) => p.filter((s) => s.id !== seriesId));
      assignSeries(null);
    } catch (e: any) { setErr(e.message); }
  }

  // 自動存草稿（debounce）
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSave("dirty");
    const tm = setTimeout(async () => {
      setSave("saving");
      try {
        await fetch(`/api/creator-island/drafts/${draft.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, meta, fragmentIds: fragIds }),
        });
        setSave("saved");
      } catch { setSave("dirty"); }
    }, 1100);
    return () => clearTimeout(tm);
  }, [title, body, meta, fragIds, draft.id]);

  const flash = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(null), 1800); }, []);

  function insertAtEnd(text: string) {
    const ed = editorRef.current; if (!ed) return;
    ed.chain().focus().insertContentAt(ed.state.doc.content.size, `<p></p>${htmlify(text)}`).run();
  }
  function replaceSelection(text: string) {
    const ed = editorRef.current; if (!ed) return;
    const { from, to, empty } = ed.state.selection;
    if (empty) ed.chain().focus().insertContentAt(from, htmlify(text)).run();
    else ed.chain().focus().insertContentAt({ from, to }, htmlify(text)).run();
  }

  async function runTool(tool: Tool) {
    const ed = editorRef.current; if (!ed) return;
    setErr(null);
    const { from, to, empty } = ed.state.selection;
    const selText = empty ? "" : ed.state.doc.textBetween(from, to, "\n");
    const full = ed.getText();
    if (tool.needsSel && !selText) { setErr(tr("createNeedSelection")); return; }

    let instruction = "";
    if (tool.promptLang) {
      const lang = await prompt({ title: tr("createTranslateLangPrompt"), defaultValue: tr("createTranslateLangDefault") });
      if (!lang) return; instruction = `目標語言：${lang}（請用該語言書寫，融入其文化語感）`;
    } else if (tool.mode === "poem_form") {
      const form = await prompt({ title: tr("createPoemFormPrompt"), defaultValue: tr("createPoemFormDefault") });
      if (!form) return; instruction = `形式：${form}`;
    }

    const input = tool.mode === "continue" ? full.slice(-2000) : (selText || full);
    const context = [title ? `標題：${title}` : "", tool.mode !== "continue" && selText ? full.slice(0, 2000) : ""].filter(Boolean).join("\n");

    setBusy(tool.mode);
    try {
      const r = await fetch("/api/creator-island/ai/assist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: draft.workspace_id, mode: tool.mode, workType: draft.work_type, input, context, instruction }),
      }).then((x) => x.json());
      if (!r.text) throw new Error(r.message || tr("createAiNoResponse"));
      if (tool.action === "insertEnd") { insertAtEnd(r.text); flash(tr("createInsertedAtEnd")); }
      else if (tool.action === "replaceSel") { replaceSelection(r.text); flash(selText ? tr("createReplacedSelection") : tr("createInserted")); }
      else { setPanel({ title: tool.label, text: r.text }); if (tool.toMeta) setMeta((m) => ({ ...m, [tool.toMeta!]: r.text })); }
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  function addFragment(f: Fragment) {
    const ed = editorRef.current; if (!ed) return;
    ed.chain().focus().insertContentAt(ed.state.doc.content.size, `<p></p>${htmlify(f.content || f.title)}`).run();
    setFragIds((p) => (p.includes(f.id) ? p : [...p, f.id]));
    flash(tr("createFragmentAdded"));
  }

  async function saveAsWork(alsoBlog: boolean) {
    setPublishing(true); setErr(null);
    try {
      // 先把當前內容存掉
      await fetch(`/api/creator-island/drafts/${draft.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, meta, fragmentIds: fragIds }),
      });
      const pub = await fetch(`/api/creator-island/drafts/${draft.id}/publish`, { method: "POST" }).then((x) => x.json());
      if (!pub.workId) throw new Error(pub.message || tr("createSaveWorkFailed"));
      if (alsoBlog) {
        const blog = await fetch(`/api/creator-island/works/${pub.workId}/publish`, { method: "POST" }).then((x) => x.json());
        if (!blog.blogId) throw new Error(blog.message || tr("createPublishBlogFailed"));
        flash(`✅ ${tr("createSavedAndBlogged")}`);
      } else {
        flash(`✅ ${tr("createSavedAsWork")}`);
      }
    } catch (e: any) { setErr(e.message); } finally { setPublishing(false); }
  }

  const saveLabel = save === "saved" ? `✓ ${tr("createSaved")}` : save === "saving" ? tr("createSaving") : `● ${tr("createUnsaved")}`;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 pb-28">
      {/* 標頭 */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <Link href="/creator-island/create" className="text-sm px-2.5 py-1.5 rounded-full bg-bg-card border border-border hover:text-accent">←</Link>
        <t.icon size={20} className="text-accent shrink-0" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tr("createTitlePlaceholder")}
          className="flex-1 min-w-[140px] bg-transparent text-lg sm:text-xl font-bold outline-none border-b border-transparent focus:border-accent py-1" />
        <Link href="/me/blog" className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-bg-card border border-border hover:border-accent hover:text-accent transition whitespace-nowrap"><FileText size={13} /> {tr("createBlog")}</Link>
        {/* 共編狀態：N 人共編中 / 離線編輯 */}
        {collab && collabStatus !== "off" && (
          collabStatus === "offline" ? (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 whitespace-nowrap" title={tr("createOfflineEditingTip")}>
              <Users size={12} /> {tr("createOfflineEditing")}
            </span>
          ) : peers > 1 ? (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
              <Users size={12} /> {tr("createPeersEditing", { n: peers })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-bg-elevated text-fg-muted whitespace-nowrap" title={tr("createCollabOnTip")}>
              <Users size={12} /> {tr("createCollabAvailable")}
            </span>
          )
        )}
        <span className={`text-xs ${save === "saved" ? "text-emerald-500" : "text-fg-muted"}`}>{saveLabel}</span>
      </div>

      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 rounded-xl px-4 py-2 text-sm mb-3 flex justify-between items-center gap-2"><span>{err}</span><button onClick={() => setErr(null)}><X size={14} /></button></div>}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
        {/* 編輯器 */}
        <div className="min-w-0">
          {collab === null && collabStatus === "connecting" ? (
            <div className="h-[460px] rounded-xl border border-border bg-bg-card animate-pulse" />
          ) : collab ? (
            <BlogEditor
              key="collab"
              collab={collab}
              onChange={setBody}
              placeholder={t.placeholder}
              onReady={(ed) => { editorRef.current = ed; seedEditor(ed); }}
            />
          ) : (
            <BlogEditor
              key="solo"
              content={body}
              onChange={setBody}
              placeholder={t.placeholder}
              onReady={(ed) => { editorRef.current = ed; }}
            />
          )}

          {/* 完稿動作 */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={() => saveAsWork(false)} disabled={publishing} className="px-4 py-2 rounded-full bg-accent text-white text-sm font-bold disabled:opacity-40">{publishing ? tr("createProcessing") : tr("createSaveAsWorkBtn")}</button>
            <button onClick={() => saveAsWork(true)} disabled={publishing} className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-bg-card border border-border text-sm hover:border-accent disabled:opacity-40"><FileText size={14} /> {tr("createSaveAndBlogBtn")}</button>
            {draft.published_work_id && <Link href="/creator-island/works" className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-bg-card border border-border text-sm hover:text-accent"><Library size={14} /> {tr("createWorksLibrary")}</Link>}
          </div>
        </div>

        {/* 側欄：工具 + 碎片素材 */}
        <aside className="space-y-4 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:sticky lg:top-4 pr-0.5">
          {/* 類型專屬工具 */}
          <div className="rounded-2xl border border-border bg-bg-card p-3">
            <div className="text-sm font-bold mb-2 inline-flex items-center gap-1.5"><Wrench size={14} /> {tr("createToolsHeading", { label: t.label })}</div>
            <div className="grid grid-cols-2 gap-1.5">
              {t.tools.map((tool) => (
                <button key={tool.mode + tool.label} onClick={() => runTool(tool)} disabled={busy !== null}
                  title={tool.needsSel ? tr("createNeedSelectFirst") : undefined}
                  className="text-xs px-2 py-2 rounded-lg bg-bg-elevated border border-border hover:border-accent hover:text-accent transition disabled:opacity-40 text-left leading-tight">
                  {busy === tool.mode ? "…" : tool.label}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-fg-muted mt-2 flex items-start gap-1"><Lightbulb size={11} className="mt-0.5 shrink-0" /> {tr("createToolsHint")}</div>
          </div>

          {/* 系列 / 專輯 */}
          <div className="rounded-2xl border border-border bg-bg-card p-3">
            <div className="text-sm font-bold mb-2 inline-flex items-center gap-1.5"><SeriesIcon size={15} /> {seriesNoun}</div>
            <select value={seriesId ?? ""} onChange={(e) => assignSeries(e.target.value || null)}
              className="w-full bg-bg-elevated border border-border rounded-lg px-2 py-2 text-sm outline-none focus:border-accent">
              <option value="">{tr("createNotInAnySeries", { noun: seriesNoun })}</option>
              {seriesList.map((s) => <option key={s.id} value={s.id}>{s.category ? `[${s.category}] ` : ""}{s.title}</option>)}
            </select>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button onClick={newSeries} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-dashed border-border text-fg-muted hover:text-accent"><Plus size={12} /> {tr("createNewSeriesBtn", { noun: seriesNoun })}</button>
              {seriesId && (
                <>
                  <button onClick={renameSeries} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-border text-fg-muted hover:text-accent">改名</button>
                  <button onClick={deleteSeries} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-border text-fg-muted hover:text-red-400">刪除</button>
                </>
              )}
            </div>
            <div className="text-[10px] text-fg-muted mt-2">{tr("createSeriesHint", { noun: seriesNoun })}</div>
          </div>

          {/* AI 結果面板（不直接插入的，如 Suno/一致性/Slogan） */}
          <AnimatePresence>
            {panel && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl border border-accent/40 bg-bg-card p-3 overflow-hidden">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-sm font-bold">{panel.title}</div>
                  <button onClick={() => setPanel(null)} className="text-fg-muted hover:text-fg"><X size={15} /></button>
                </div>
                <pre className="text-xs text-fg-muted whitespace-pre-wrap font-sans max-h-64 overflow-y-auto">{panel.text}</pre>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { navigator.clipboard?.writeText(panel.text); flash(tr("createCopied")); }} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-bg-elevated hover:text-accent"><Copy size={12} /> {tr("createCopy")}</button>
                  <button onClick={() => { insertAtEnd(panel.text); flash(tr("createInsertedAtEnd")); }} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-bg-elevated hover:text-accent"><ArrowDownToLine size={12} /> {tr("createInsertAtEnd")}</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 碎片素材欄 */}
          <div className="rounded-2xl border border-border bg-bg-card p-3">
            <div className="text-sm font-bold mb-2 inline-flex items-center gap-1.5"><Trees size={14} /> {tr("createFragments", { n: fragments.length })}</div>
            {fragments.length > 0 && (
              <div className="relative mb-2">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
                <input value={fragQ} onChange={(e) => setFragQ(e.target.value)} placeholder={tr("createSearchFragments")}
                  className="w-full bg-bg-elevated border border-border rounded-full pl-7 pr-7 py-1.5 text-xs outline-none focus:border-accent" />
                {fragQ && <button onClick={() => setFragQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"><X size={12} /></button>}
              </div>
            )}
            {fragments.length === 0 ? (
              <div className="text-xs text-fg-muted">{tr("createNoFragments")}</div>
            ) : (() => {
              const ql = fragQ.trim().toLowerCase();
              const shown = ql ? fragments.filter((f) => (f.title + " " + (f.content ?? "")).toLowerCase().includes(ql)) : fragments;
              return shown.length === 0 ? (
                <div className="text-xs text-fg-muted">{tr("createFragNoMatch", { q: fragQ })}</div>
              ) : (
              <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {shown.map((f) => (
                  <li key={f.id}>
                    <button onClick={() => addFragment(f)}
                      className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs border transition ${fragIds.includes(f.id) ? "border-accent/50 bg-accent/[0.06]" : "border-border bg-bg-elevated hover:border-accent/40"}`}>
                      <span className="font-bold block truncate">{f.title} {fragIds.includes(f.id) && <span className="text-accent">{tr("createMaterialTag")}</span>}</span>
                      {f.content && !f.content.startsWith("![](") && <span className="text-fg-muted line-clamp-2">{f.content}</span>}
                    </button>
                  </li>
                ))}
              </ul>
              );
            })()}
            <div className="text-[10px] text-fg-muted mt-2">{tr("createFragmentTip")}</div>
          </div>
        </aside>
      </div>

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-[5.5rem] md:bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full bg-emerald-500 text-black text-sm font-bold shadow-lg">{toast}</motion.div>
        )}
      </AnimatePresence>

      {/* 綠寶：創作引擎裡也能隨側陪聊（圖/語音/檔案） */}
      <IslandChat workspaceId={draft.workspace_id} />
    </div>
  );
}
