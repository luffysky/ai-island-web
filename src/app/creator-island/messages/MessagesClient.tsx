"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Paperclip } from "lucide-react";
import { uploadMedia } from "@/lib/creator-upload";

type Thread = { id: string; last_message_at?: string; other?: { id: string; username?: string; display_name?: string; avatar_url?: string } };
type Msg = { id: number; sender_id: string; body?: string | null; media_url?: string | null; media_type?: string | null; created_at: string };
const nm = (o?: Thread["other"]) => o?.display_name || o?.username || "創作者";

async function call(url: string, method: string, body?: any) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message || j.error || `HTTP ${res.status}`);
  return j;
}

export function MessagesClient({ initialThreads, meId, initialThreadId }: { initialThreads: Thread[]; meId: string; initialThreadId: string | null }) {
  const [threads] = useState<Thread[]>(initialThreads);
  const [active, setActive] = useState<string | null>(initialThreadId);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadMsgs(id: string) {
    setErr(null);
    try { const j = await call(`/api/creator-island/social/dm/${id}`, "GET"); setMsgs(j.messages ?? []); }
    catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { if (active) loadMsgs(active); }, [active]);

  async function send() {
    if (!active || !text.trim()) return;
    setBusy(true);
    try { const j = await call(`/api/creator-island/social/dm/${active}`, "POST", { body: text.trim() }); setMsgs((m) => [...m, j.message]); setText(""); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function sendMedia(file: File) {
    if (!active) return; setBusy(true); setErr(null);
    try {
      const url = await uploadMedia(file);
      const mt = file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : file.type.startsWith("image") ? "image" : "file";
      const j = await call(`/api/creator-island/social/dm/${active}`, "POST", { mediaUrl: url, mediaType: mt });
      setMsgs((m) => [...m, j.message]);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  const activeThread = threads.find((t) => t.id === active);

  return (
    <div className="grid sm:grid-cols-[220px_1fr] gap-3 min-h-[60vh]">
      {/* 對話列表 */}
      <div className={`space-y-1 ${active ? "hidden sm:block" : ""}`}>
        {threads.length === 0 && <div className="text-xs text-fg-muted p-3">還沒有對話。到「好友」傳訊息開始。</div>}
        {threads.map((t) => (
          <button key={t.id} onClick={() => setActive(t.id)} className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm ${active === t.id ? "bg-accent/15" : "hover:bg-bg-elevated"}`}>
            {t.other?.avatar_url ? <img src={t.other.avatar_url} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-accent/20 grid place-items-center text-xs">{nm(t.other)[0]}</div>}
            <span className="truncate">{nm(t.other)}</span>
          </button>
        ))}
      </div>

      {/* 對話內容 */}
      <div className="flex flex-col bg-bg-card border border-border rounded-2xl overflow-hidden">
        {!active && <div className="grid place-items-center flex-1 text-sm text-fg-muted">選一個對話</div>}
        {active && (
          <>
            <div className="p-3 border-b border-border text-sm font-bold flex items-center gap-2">
              <button onClick={() => setActive(null)} className="sm:hidden text-fg-muted"><ArrowLeft size={16} /></button>{nm(activeThread?.other)}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[55vh]">
              {err && <div className="text-xs text-red-400">⚠️ {err}</div>}
              {msgs.map((m) => (
                <div key={m.id} className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.sender_id === meId ? "ml-auto bg-accent text-white" : "bg-bg-elevated"}`}>
                  {m.body}
                  {m.media_url && m.media_type === "image" && <img src={m.media_url} className="rounded-lg mt-1 max-h-48" />}
                  {m.media_url && m.media_type === "video" && <video src={m.media_url} controls className="rounded-lg mt-1 max-h-48" />}
                  {m.media_url && m.media_type === "audio" && <audio src={m.media_url} controls className="mt-1 w-full" />}
                  {m.media_url && m.media_type === "file" && <a href={m.media_url} target="_blank" className="underline text-xs block mt-1">附件</a>}
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-border flex items-center gap-2">
              <label className="cursor-pointer hover:text-accent"><Paperclip size={18} /><input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) sendMedia(f); e.currentTarget.value = ""; }} /></label>
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="訊息…" className="flex-1 bg-bg-elevated border border-border rounded-full px-3 py-2 text-sm outline-none focus:border-accent" />
              <button onClick={send} disabled={busy} className="px-4 py-2 rounded-full bg-accent text-white text-sm disabled:opacity-40">送</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
