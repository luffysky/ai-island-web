"use client";

import Link from "next/link";
import { useState } from "react";

type Work = { id: string; title: string; body: string; work_type: string; status: string; meta: any; published_blog_id: string | null };

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
  const [title, setTitle] = useState(work.title);
  const [body, setBody] = useState(work.body);
  const [status, setStatus] = useState(work.status);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const meta = work.meta || {};

  async function save() {
    setBusy("save"); setErr(null); setMsg(null);
    try { await patch(`/api/creator-island/works/${work.id}`, { title, body, status }); setMsg("已儲存"); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function publish() {
    setBusy("publish"); setErr(null); setMsg(null);
    try { await api(`/api/creator-island/works/${work.id}/publish`); setMsg("已發布成部落格草稿"); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function archive() {
    if (!confirm("封存並回收成碎片？")) return;
    setBusy("archive"); setErr(null);
    try { const r = await api(`/api/creator-island/works/${work.id}/archive`); setMsg(`已封存、回收 ${r.recycled} 個碎片`); setStatus("archived"); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/creator-island/works" className="text-sm text-accent hover:underline">← 作品庫</Link>
        <div className="flex gap-2 text-sm">
          {canEdit && <button onClick={save} disabled={busy !== null} className="px-3 py-1.5 rounded-full bg-accent text-white disabled:opacity-40">{busy === "save" ? "…" : "儲存"}</button>}
          {canEdit && work.work_type === "article" && <button onClick={publish} disabled={busy !== null} className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 disabled:opacity-40">發布成文章</button>}
          {canEdit && status !== "archived" && <button onClick={archive} disabled={busy !== null} className="px-3 py-1.5 rounded-full bg-bg-elevated disabled:opacity-40">封存→回收</button>}
        </div>
      </div>
      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-2 text-sm">⚠️ {err}</div>}
      {msg && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-2 text-sm">✅ {msg}</div>}

      <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit}
        className="w-full bg-transparent text-2xl font-bold outline-none border-b border-border pb-2" />
      <div className="flex items-center gap-2 text-xs text-fg-muted">
        <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300">{work.work_type}</span>
        {canEdit && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-bg-elevated border border-border rounded-full px-2 py-0.5">
            <option value="draft">草稿</option><option value="in_progress">進行中</option><option value="done">完成</option><option value="archived">已封存</option>
          </select>
        )}
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} disabled={!canEdit} rows={18}
        className="w-full bg-bg-card border border-border rounded-xl p-4 text-sm outline-none focus:border-accent resize-y whitespace-pre-wrap" />

      {(meta.sunoPrompt || meta.mvPrompt) && (
        <div className="bg-bg-elevated rounded-xl p-3 text-xs space-y-1">
          {meta.sunoPrompt && <div><b>🎵 Suno：</b>{meta.sunoPrompt}</div>}
          {meta.mvPrompt && <div><b>🎬 MV：</b>{meta.mvPrompt}</div>}
        </div>
      )}

      {/* E3 創作家譜：這篇由哪些碎片長成 + 衍生數 */}
      {(usedFragments.length > 0 || derivedCount > 0) && (
        <div className="bg-bg-card border border-border rounded-xl p-3 text-xs space-y-1">
          <div className="font-bold text-fg-muted">🔗 創作家譜</div>
          {usedFragments.length > 0 && (
            <div>由 <b>{usedFragments.length}</b> 個碎片長成：{usedFragments.map((f) => f.title).join("、")}</div>
          )}
          {derivedCount > 0 && <div>已衍生出 <b>{derivedCount}</b> 個資產（封存回收等）</div>}
        </div>
      )}
    </div>
  );
}
