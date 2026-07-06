"use client";

import { useState } from "react";
import { Sparkles, Loader2, Send, Check, RefreshCw, Trash2, ExternalLink } from "lucide-react";

type Board = { id: string; name: string; slug: string; description: string | null; category: string; emoji: string };
type Persona = { id: string; username: string; display_name: string; bio: string | null };
type Draft = { title: string; content: string; tags: string[]; personaId: string; views: number; published?: string };

const TONES = [
  { id: "newbie", label: "真實新手" }, { id: "excited", label: "熱血分享" }, { id: "stuck", label: "卡關求救" },
  { id: "share", label: "資源整理" }, { id: "chat", label: "閒聊吐槽" }, { id: "teach", label: "簡短教學" },
];
const INTENTS = [
  { id: "discuss", label: "引發留言" }, { id: "resonate", label: "製造共鳴" }, { id: "teach", label: "帶知識點" }, { id: "feature", label: "帶出站內功能" },
];

export function ForumSeedClient({ boards, personas }: { boards: Board[]; personas: Persona[] }) {
  const [boardId, setBoardId] = useState(boards[0]?.id ?? "");
  const [tone, setTone] = useState("newbie");
  const [intent, setIntent] = useState("discuss");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [defaultPersona, setDefaultPersona] = useState(personas[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const board = boards.find((b) => b.id === boardId);

  async function generate() {
    if (!board) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/admin/forum-seed/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardName: board.name, boardDesc: board.description, tone, intent, topic: topic.trim() || undefined, count }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || j.error || "生成失敗");
      setDrafts((j.drafts as any[]).map((d) => ({
        title: d.title, content: d.content, tags: Array.isArray(d.tags) ? d.tags : [],
        personaId: defaultPersona, views: 20 + Math.floor(Math.random() * 180),
      })));
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  function patch(i: number, p: Partial<Draft>) { setDrafts((d) => d.map((x, k) => (k === i ? { ...x, ...p } : x))); }
  function remove(i: number) { setDrafts((d) => d.filter((_, k) => k !== i)); }

  async function publish(i: number) {
    const d = drafts[i];
    if (!board || !d.personaId || !d.title.trim()) { setErr("缺 版塊 / 作者 / 標題"); return; }
    patch(i, { published: "publishing" });
    try {
      const res = await fetch("/api/admin/forum-seed/publish", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId, personaId: d.personaId, title: d.title, content: d.content, tags: d.tags, views: d.views }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || j.error || "發佈失敗");
      patch(i, { published: j.thread?.id ?? "ok" });
    } catch (e: any) { setErr(e.message); patch(i, { published: undefined }); }
  }

  return (
    <div className="space-y-5">
      {/* 設定 */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm">版塊
            <select value={boardId} onChange={(e) => setBoardId(e.target.value)} className="mt-1 w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm">
              {boards.map((b) => <option key={b.id} value={b.id}>{b.emoji} {b.category}／{b.name}</option>)}
            </select>
          </label>
          <label className="text-sm">預設作者（虛擬 AI 住民）
            <select value={defaultPersona} onChange={(e) => setDefaultPersona(e.target.value)} className="mt-1 w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm">
              {personas.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="text-xs text-fg-muted w-full">語氣</div>
          {TONES.map((t) => <button key={t.id} onClick={() => setTone(t.id)} className={`text-xs px-3 py-1.5 rounded-full border ${tone === t.id ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-elevated"}`}>{t.label}</button>)}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="text-xs text-fg-muted w-full">目的</div>
          {INTENTS.map((t) => <button key={t.id} onClick={() => setIntent(t.id)} className={`text-xs px-3 py-1.5 rounded-full border ${intent === t.id ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-elevated"}`}>{t.label}</button>)}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="主題方向（可選，例：Cursor、React hooks、轉職）" className="flex-1 min-w-[200px] bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" />
          <label className="text-sm text-fg-muted inline-flex items-center gap-1">篇數
            <input type="number" min={1} max={8} value={count} onChange={(e) => setCount(Math.max(1, Math.min(8, Number(e.target.value) || 5)))} className="w-16 bg-bg-elevated border border-border rounded-lg px-2 py-2 text-sm" />
          </label>
          <button onClick={generate} disabled={busy || !boardId} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-accent text-black font-bold disabled:opacity-40">
            {busy ? <><Loader2 size={16} className="animate-spin" /> 生成中…</> : <><Sparkles size={16} /> 生成草稿</>}
          </button>
        </div>
      </div>

      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 rounded-xl px-4 py-2 text-sm">{err}</div>}

      {/* 草稿審核 */}
      {drafts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold">草稿（{drafts.length}）· 審核 / 編輯後再發</div>
            <button onClick={generate} disabled={busy} className="text-xs text-fg-muted hover:text-accent inline-flex items-center gap-1"><RefreshCw size={12} /> 重生成</button>
          </div>
          {drafts.map((d, i) => {
            const done = d.published && d.published !== "publishing";
            return (
              <div key={i} className={`bg-bg-card border rounded-2xl p-4 space-y-2 ${done ? "border-emerald-500/40 opacity-80" : "border-border"}`}>
                <input value={d.title} onChange={(e) => patch(i, { title: e.target.value })} disabled={!!done}
                  className="w-full bg-transparent font-bold text-sm outline-none border-b border-transparent focus:border-accent/40 pb-1" />
                <textarea value={d.content} onChange={(e) => patch(i, { content: e.target.value })} disabled={!!done} rows={4}
                  className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-accent/50" />
                <div className="flex items-center gap-2 flex-wrap">
                  <input value={d.tags.join("、")} onChange={(e) => patch(i, { tags: e.target.value.split(/[,，、]/).map((t) => t.trim()).filter(Boolean) })} disabled={!!done}
                    placeholder="標籤（、分隔）" className="flex-1 min-w-[140px] bg-bg-elevated border border-border rounded-lg px-2 py-1.5 text-xs outline-none" />
                  <select value={d.personaId} onChange={(e) => patch(i, { personaId: e.target.value })} disabled={!!done} className="bg-bg-elevated border border-border rounded-lg px-2 py-1.5 text-xs">
                    {personas.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                  </select>
                  <label className="text-xs text-fg-muted inline-flex items-center gap-1">瀏覽
                    <input type="number" min={0} max={999} value={d.views} onChange={(e) => patch(i, { views: Math.max(0, Math.min(999, Number(e.target.value) || 0)) })} disabled={!!done} className="w-14 bg-bg-elevated border border-border rounded px-1.5 py-1 text-xs" />
                  </label>
                </div>
                <div className="flex items-center justify-end gap-2">
                  {done ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1"><Check size={13} /> 已發佈
                      {d.published !== "ok" && <a href={`/forum/thread/${d.published}`} target="_blank" rel="noreferrer" className="ml-1 underline inline-flex items-center gap-0.5">看貼文 <ExternalLink size={11} /></a>}
                    </span>
                  ) : (<>
                    <button onClick={() => remove(i)} className="text-xs text-fg-muted hover:text-red-400 inline-flex items-center gap-1"><Trash2 size={12} /> 丟棄</button>
                    <button onClick={() => publish(i)} disabled={d.published === "publishing"} className="text-xs px-4 py-1.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 font-bold inline-flex items-center gap-1 disabled:opacity-40">
                      {d.published === "publishing" ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} 發到討論區
                    </button>
                  </>)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
