"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Editor } from "@tiptap/react";
import { motion, AnimatePresence } from "framer-motion";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { getType, type Tool } from "../engine-types";

type Fragment = { id: string; title: string; content: string; source_type: string };
type Draft = {
  id: string; workspace_id: string; work_type: string; title: string; body: string;
  doc: Record<string, unknown>; meta: Record<string, unknown>; fragment_ids: string[];
  status: string; published_work_id: string | null;
};

function htmlify(text: string): string {
  return text.split(/\n{2,}/).map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`).join("");
}

export function EngineWorkspace({ draft, fragments }: { draft: Draft; fragments: Fragment[] }) {
  const t = getType(draft.work_type);
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const [meta, setMeta] = useState<Record<string, unknown>>(draft.meta ?? {});
  const [fragIds, setFragIds] = useState<string[]>(draft.fragment_ids ?? []);
  const [save, setSave] = useState<"saved" | "saving" | "dirty">("saved");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [panel, setPanel] = useState<{ title: string; text: string } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const first = useRef(true);

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
    if (tool.needsSel && !selText) { setErr("請先在內文選取一段文字，再用這個工具。"); return; }

    let instruction = "";
    if (tool.promptLang) {
      const lang = window.prompt("轉譯成哪個語言？（例：日語 / English / 韓語 / 粵語 / 文言文）", "日語");
      if (!lang) return; instruction = `目標語言：${lang}（請用該語言書寫，融入其文化語感）`;
    } else if (tool.mode === "poem_form") {
      const form = window.prompt("詩的形式？（現代詩 / 俳句 / 絕句 / 律詩 / 十四行）", "現代詩");
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
      if (!r.text) throw new Error(r.message || "AI 沒有回應");
      if (tool.action === "insertEnd") { insertAtEnd(r.text); flash("已插入文末"); }
      else if (tool.action === "replaceSel") { replaceSelection(r.text); flash(selText ? "已取代選取" : "已插入"); }
      else { setPanel({ title: tool.label, text: r.text }); if (tool.toMeta) setMeta((m) => ({ ...m, [tool.toMeta!]: r.text })); }
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  function addFragment(f: Fragment) {
    const ed = editorRef.current; if (!ed) return;
    ed.chain().focus().insertContentAt(ed.state.doc.content.size, `<p></p>${htmlify(f.content || f.title)}`).run();
    setFragIds((p) => (p.includes(f.id) ? p : [...p, f.id]));
    flash("已把碎片放進內文（並列為素材）");
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
      if (!pub.workId) throw new Error(pub.message || "存成作品失敗");
      if (alsoBlog) {
        const blog = await fetch(`/api/creator-island/works/${pub.workId}/publish`, { method: "POST" }).then((x) => x.json());
        if (!blog.blogId) throw new Error(blog.message || "發部落格失敗");
        flash("✅ 已存成作品並發成部落格草稿");
      } else {
        flash("✅ 已存成作品（作品庫可見）");
      }
    } catch (e: any) { setErr(e.message); } finally { setPublishing(false); }
  }

  const saveLabel = save === "saved" ? "✓ 已儲存" : save === "saving" ? "儲存中…" : "● 未儲存";

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 pb-28">
      {/* 標頭 */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <Link href="/creator-island/create" className="text-sm px-2.5 py-1.5 rounded-full bg-bg-card border border-border hover:text-accent">←</Link>
        <span className="text-xl">{t.emoji}</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="作品標題…"
          className="flex-1 min-w-[140px] bg-transparent text-lg sm:text-xl font-bold outline-none border-b border-transparent focus:border-accent py-1" />
        <span className={`text-xs ${save === "saved" ? "text-emerald-400" : "text-fg-muted"}`}>{saveLabel}</span>
      </div>

      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-2 text-sm mb-3 flex justify-between"><span>⚠️ {err}</span><button onClick={() => setErr(null)}>✕</button></div>}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr),340px] gap-4">
        {/* 編輯器 */}
        <div className="min-w-0">
          <BlogEditor content={body} onChange={setBody} placeholder={t.placeholder} onReady={(ed) => { editorRef.current = ed; }} />

          {/* 完稿動作 */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={() => saveAsWork(false)} disabled={publishing} className="px-4 py-2 rounded-full bg-accent text-white text-sm font-bold disabled:opacity-40">{publishing ? "處理中…" : "💾 存成作品"}</button>
            <button onClick={() => saveAsWork(true)} disabled={publishing} className="px-4 py-2 rounded-full bg-bg-card border border-border text-sm hover:border-accent disabled:opacity-40">📝 存成作品並發部落格草稿</button>
            {draft.published_work_id && <Link href="/creator-island/works" className="px-4 py-2 rounded-full bg-bg-card border border-border text-sm hover:text-accent">📚 作品庫</Link>}
          </div>
        </div>

        {/* 側欄：工具 + 碎片素材 */}
        <aside className="space-y-4 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:sticky lg:top-4 pr-0.5">
          {/* 類型專屬工具 */}
          <div className="rounded-2xl border border-border bg-bg-card p-3">
            <div className="text-sm font-bold mb-2">🛠️ {t.label}工具</div>
            <div className="grid grid-cols-2 gap-1.5">
              {t.tools.map((tool) => (
                <button key={tool.mode + tool.label} onClick={() => runTool(tool)} disabled={busy !== null}
                  title={tool.needsSel ? "需先選取文字" : undefined}
                  className="text-xs px-2 py-2 rounded-lg bg-bg-elevated border border-border hover:border-accent hover:text-accent transition disabled:opacity-40 text-left leading-tight">
                  {busy === tool.mode ? "…" : tool.label}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-fg-muted mt-2">💡 選取一段文字後再按「改寫/潤稿/轉譯」，會就地處理那段。</div>
          </div>

          {/* AI 結果面板（不直接插入的，如 Suno/一致性/Slogan） */}
          <AnimatePresence>
            {panel && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl border border-accent/40 bg-bg-card p-3 overflow-hidden">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-sm font-bold">{panel.title}</div>
                  <button onClick={() => setPanel(null)} className="text-fg-muted hover:text-fg text-sm">✕</button>
                </div>
                <pre className="text-xs text-fg-muted whitespace-pre-wrap font-sans max-h-64 overflow-y-auto">{panel.text}</pre>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { navigator.clipboard?.writeText(panel.text); flash("已複製"); }} className="text-xs px-3 py-1.5 rounded-full bg-bg-elevated hover:text-accent">📋 複製</button>
                  <button onClick={() => { insertAtEnd(panel.text); flash("已插入文末"); }} className="text-xs px-3 py-1.5 rounded-full bg-bg-elevated hover:text-accent">↧ 插入文末</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 碎片素材欄 */}
          <div className="rounded-2xl border border-border bg-bg-card p-3">
            <div className="text-sm font-bold mb-2">🌲 碎片素材（{fragments.length}）</div>
            {fragments.length === 0 ? (
              <div className="text-xs text-fg-muted">這座島還沒有碎片。回島上捕捉或種島。</div>
            ) : (
              <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {fragments.map((f) => (
                  <li key={f.id}>
                    <button onClick={() => addFragment(f)}
                      className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs border transition ${fragIds.includes(f.id) ? "border-accent/50 bg-accent/[0.06]" : "border-border bg-bg-elevated hover:border-accent/40"}`}>
                      <span className="font-bold block truncate">{f.title} {fragIds.includes(f.id) && <span className="text-accent">·素材</span>}</span>
                      {f.content && !f.content.startsWith("![](") && <span className="text-fg-muted line-clamp-2">{f.content}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="text-[10px] text-fg-muted mt-2">點碎片＝放進內文並列為素材（作品家譜會記）。</div>
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
    </div>
  );
}
