"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, Send, Check, Trash2, ExternalLink, Plus } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Persona = { id: string; username: string; display_name: string };
type Note = { title: string; content: string };

export function NotesSeedClient({ personas }: { personas: Persona[] }) {
  const toast = useToast();
  const [author, setAuthor] = useState(personas[0]?.id ?? "");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(6);
  const [priceZ, setPriceZ] = useState(0);
  const [busy, setBusy] = useState<"gen" | "pub" | null>(null);
  const [packTitle, setPackTitle] = useState("");
  const [packDesc, setPackDesc] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [done, setDone] = useState<string | null>(null);

  async function generate() {
    setBusy("gen"); setDone(null);
    try {
      const res = await fetch("/api/admin/notes-seed/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: topic.trim() || undefined, count }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || j.error || "生成失敗");
      setPackTitle(j.packTitle ?? topic); setPackDesc(j.packDesc ?? ""); setNotes(j.notes ?? []);
      toast.success(`生了 ${j.notes.length} 則筆記`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function publish() {
    if (!author || !packTitle.trim() || notes.length === 0) { toast.error("缺 作者 / 標題 / 筆記"); return; }
    setBusy("pub");
    try {
      const res = await fetch("/api/admin/notes-seed/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ authorId: author, packTitle, packDesc, priceZ, notes }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || j.error || "發佈失敗");
      setDone(j.href ?? "ok"); toast.success("已上架到筆記市集 ✓");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  const patch = (i: number, p: Partial<Note>) => setNotes((n) => n.map((x, k) => (k === i ? { ...x, ...p } : x)));

  return (
    <div className="space-y-4">
      <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm">賣家（官方帳號）
            <select value={author} onChange={(e) => setAuthor(e.target.value)} className="mt-1 w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm">
              {personas.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">則數
              <input type="number" min={3} max={10} value={count} onChange={(e) => setCount(Math.max(3, Math.min(10, Number(e.target.value) || 6)))} className="mt-1 w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">價格 Z
              <input type="number" min={0} value={priceZ} onChange={(e) => setPriceZ(Math.max(0, Number(e.target.value) || 0))} className="mt-1 w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm" />
            </label>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="主題（例：Python 速查、CSS Flexbox、Git 常用）" className="flex-1 min-w-[200px] bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" />
          <button onClick={generate} disabled={busy !== null} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-accent text-black font-bold disabled:opacity-40">
            {busy === "gen" ? <><Loader2 size={16} className="animate-spin" /> 生成中…</> : <><Sparkles size={16} /> AI 生成筆記包</>}
          </button>
        </div>
        <p className="text-[11px] text-fg-muted">price=0 就是免費包。生成後可逐則編輯，發佈會建 notes + 一個 note_product 上架市集。</p>
      </div>

      {(notes.length > 0 || packTitle) && (
        <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-2">
          <input value={packTitle} onChange={(e) => setPackTitle(e.target.value)} placeholder="筆記包標題" className="w-full bg-transparent font-bold outline-none border-b border-transparent focus:border-accent/40 pb-1" />
          <input value={packDesc} onChange={(e) => setPackDesc(e.target.value)} placeholder="一句話介紹" className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-xs outline-none" />
          <div className="space-y-2">
            {notes.map((n, i) => (
              <div key={i} className="border border-border rounded-lg p-2 space-y-1">
                <div className="flex items-center gap-2">
                  <input value={n.title} onChange={(e) => patch(i, { title: e.target.value })} placeholder="筆記標題" className="flex-1 bg-transparent text-sm font-medium outline-none border-b border-transparent focus:border-accent/40" />
                  <button onClick={() => setNotes((x) => x.filter((_, k) => k !== i))} className="text-fg-muted hover:text-red-400"><Trash2 size={13} /></button>
                </div>
                <textarea value={n.content} onChange={(e) => patch(i, { content: e.target.value })} rows={3} className="w-full bg-bg-elevated border border-border rounded px-2 py-1.5 text-xs font-mono outline-none focus:border-accent/50" />
              </div>
            ))}
            <button onClick={() => setNotes((n) => [...n, { title: "", content: "<p></p>" }])} className="text-xs text-accent inline-flex items-center gap-1 hover:underline"><Plus size={12} /> 加一則</button>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            {done ? (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1"><Check size={13} /> 已上架
                {done !== "ok" && <Link href={done} target="_blank" className="ml-1 underline inline-flex items-center gap-0.5">看商品 <ExternalLink size={11} /></Link>}
              </span>
            ) : (
              <button onClick={publish} disabled={busy === "pub"} className="text-xs px-4 py-1.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 font-bold inline-flex items-center gap-1 disabled:opacity-40">
                {busy === "pub" ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} 上架到市集{priceZ === 0 ? "（免費）" : ""}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
