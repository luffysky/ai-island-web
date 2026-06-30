"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { uploadMedia } from "@/lib/creator-upload";

type Msg = { role: "user" | "assistant"; content: string };

const BTN = 52; // 綠寶按鈕直徑(px)
const GREETING: Msg = { role: "assistant", content: "嗨，我是綠寶 ✨ 想做什麼作品？丟碎片、貼圖、或直接問我都可以。" };

export function IslandChat({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [text, setText] = useState("");
  const [img, setImg] = useState<{ data: string; mediaType: string; preview: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<{ id: string; title: string; updated_at: string }[]>([]);
  const [showHist, setShowHist] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  async function saveSession(allMsgs: Msg[]) {
    if (allMsgs.length < 2) return; // 還沒對話內容
    try {
      const r = await fetch("/api/creator-island/ai/chat/sessions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, sessionId, messages: allMsgs }),
      }).then((x) => x.json());
      if (r.id && r.id !== sessionId) setSessionId(r.id);
    } catch { /* 存歷史失敗不影響聊天 */ }
  }
  async function loadSessions() {
    try { const r = await fetch(`/api/creator-island/ai/chat/sessions?workspaceId=${workspaceId}`).then((x) => x.json()); setSessions(r.items ?? []); } catch { /* ignore */ }
  }
  async function openSession(id: string) {
    try {
      const r = await fetch(`/api/creator-island/ai/chat/sessions/${id}`).then((x) => x.json());
      if (r.session) { setMsgs(r.session.messages?.length ? r.session.messages : [GREETING]); setSessionId(r.session.id); setShowHist(false); }
    } catch { /* ignore */ }
  }
  async function delSession(id: string) {
    try { await fetch(`/api/creator-island/ai/chat/sessions/${id}`, { method: "DELETE" }); } catch { /* ignore */ }
    setSessions((p) => p.filter((s) => s.id !== id));
    if (id === sessionId) newChat();
  }
  function newChat() { setMsgs([GREETING]); setSessionId(null); setShowHist(false); }

  // === 可拖曳的浮動位置（預設左下、避開手機底部導覽列）===
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ ox: number; oy: number; moved: boolean } | null>(null);
  useEffect(() => {
    // 預設：左下角、清開底部導覽列(行動裝置 56px)+安全區
    const navGap = window.matchMedia("(min-width: 768px)").matches ? 16 : 88;
    setPos({ x: 16, y: window.innerHeight - navGap - BTN });
  }, []);
  const clamp = useCallback((x: number, y: number) => ({
    x: Math.max(8, Math.min(x, window.innerWidth - BTN - 8)),
    y: Math.max(8, Math.min(y, window.innerHeight - BTN - 8)),
  }), []);
  function onDown(e: React.PointerEvent) {
    if (!pos) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { ox: e.clientX - pos.x, oy: e.clientY - pos.y, moved: false };
  }
  function onMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const nx = e.clientX - drag.current.ox, ny = e.clientY - drag.current.oy;
    if (Math.abs(nx - (pos?.x ?? 0)) > 4 || Math.abs(ny - (pos?.y ?? 0)) > 4) drag.current.moved = true;
    setPos(clamp(nx, ny));
  }
  function onUp(e: React.PointerEvent) {
    const moved = drag.current?.moved;
    drag.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (!moved) setOpen((o) => !o); // 沒拖動 = 點擊開關
  }

  // 面板位置：盡量貼著按鈕、且永不超出視口
  const panel = (() => {
    if (!pos) return { left: 16, top: 80 };
    const W = Math.min(window.innerWidth * 0.92, 380);
    const H = Math.min(window.innerHeight * 0.7, 560);
    let left = pos.x;
    if (left + W > window.innerWidth - 8) left = window.innerWidth - W - 8;
    left = Math.max(8, left);
    let top = pos.y - H - 10;                 // 預設開在按鈕上方
    if (top < 8) top = Math.min(pos.y + BTN + 10, window.innerHeight - H - 8); // 上方放不下→下方
    top = Math.max(8, top);
    return { left, top, width: W, height: H };
  })();

  function voice() {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) { alert("此瀏覽器不支援語音"); return; }
    const r = new SR(); r.lang = "zh-TW"; r.interimResults = false;
    r.onresult = (e: any) => setText((t) => (t ? t + " " : "") + e.results[0][0].transcript); r.start();
  }
  function pickImage(file: File) {
    const reader = new FileReader();
    reader.onload = () => { const url = String(reader.result); setImg({ data: url.split(",")[1], mediaType: file.type || "image/jpeg", preview: url }); };
    reader.readAsDataURL(file);
  }
  async function pickFile(file: File) {
    setBusy(true);
    try { const url = await uploadMedia(file); setText((t) => `${t}\n[附件 ${file.name}] ${url}`.trim()); } catch { alert("上傳失敗"); } finally { setBusy(false); }
  }
  async function send() {
    if (!text.trim() && !img) return;
    const userMsg: Msg = { role: "user", content: text.trim() || "（看這張圖）" };
    const next = [...msgs, userMsg];
    setMsgs(next); setText(""); const image = img; setImg(null); setBusy(true);
    try {
      const r = await fetch("/api/creator-island/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })), image: image ? { data: image.data, mediaType: image.mediaType } : undefined, workspaceId }),
      }).then((x) => x.json());
      const final: Msg[] = [...next, { role: "assistant", content: r.reply || r.message || "（沒有回覆）" }];
      setMsgs(final);
      saveSession(final);
    } catch (e: any) { setMsgs((m) => [...m, { role: "assistant", content: "出錯了：" + e.message }]); } finally { setBusy(false); }
  }

  if (!pos) return null;

  return (
    <>
      {/* 可拖曳的綠寶按鈕（避開底部導覽列、點擊開關、長按拖動） */}
      <button
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
        title="問綠寶（可拖曳）" style={{ left: pos.x, top: pos.y, touchAction: "none" }}
        className="fixed z-[55] h-[52px] px-4 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-black shadow-lg grid place-items-center font-bold hover:scale-105 transition select-none cursor-grab active:cursor-grabbing">✨ 問綠寶</button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.96 }}
            style={{ left: panel.left, top: panel.top, width: panel.width, height: panel.height }}
            className="fixed z-[56] bg-bg-card border border-emerald-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border flex items-center gap-2">
              <span className="font-bold">✨ 綠寶</span><span className="text-xs text-fg-muted">創作夥伴</span>
              <button onClick={() => { setShowHist((v) => !v); if (!showHist) loadSessions(); }} title="歷史對話" className="ml-auto text-fg-muted hover:text-accent">🕘</button>
              <button onClick={newChat} title="開新對話" className="text-fg-muted hover:text-accent">＋</button>
              <button onClick={() => setOpen(false)} className="text-fg-muted hover:text-fg">✕</button>
            </div>

            {showHist && (
              <div className="absolute inset-0 top-[49px] z-10 bg-bg-card overflow-y-auto p-2 space-y-1">
                <div className="text-xs text-fg-muted px-1 py-1">🕘 歷史對話（{sessions.length}）</div>
                {sessions.length === 0 ? (
                  <div className="text-xs text-fg-muted px-1 py-4 text-center">還沒有對話紀錄。</div>
                ) : sessions.map((s) => (
                  <div key={s.id} className="group flex items-center gap-1 rounded-lg hover:bg-bg-elevated">
                    <button onClick={() => openSession(s.id)} className="flex-1 min-w-0 text-left px-2 py-2 text-sm">
                      <div className="truncate">{s.title}</div>
                      <div className="text-[10px] text-fg-muted">{new Date(s.updated_at).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
                    </button>
                    <button onClick={() => delSession(s.id)} title="刪除" className="px-2 text-fg-muted opacity-0 group-hover:opacity-100 hover:text-red-400">✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {msgs.map((m, i) => (
                <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${m.role === "user" ? "ml-auto bg-accent text-white" : "bg-bg-elevated"}`}>{m.content}</div>
              ))}
              {busy && <div className="text-xs text-fg-muted animate-pulse">綠寶思考中…</div>}
              <div ref={endRef} />
            </div>
            {img && <div className="px-3 pb-1"><img src={img.preview} className="h-14 rounded inline-block" /><button onClick={() => setImg(null)} className="text-xs text-fg-muted ml-2">移除</button></div>}
            <div className="p-2 border-t border-border flex items-center gap-1.5">
              <button onClick={voice} title="語音" className="text-lg hover:text-accent">🎤</button>
              <label title="圖片(可看圖)" className="text-lg cursor-pointer hover:text-accent">📷<input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImage(f); e.currentTarget.value = ""; }} /></label>
              <label title="檔案" className="text-lg cursor-pointer hover:text-accent">📎<input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.currentTarget.value = ""; }} /></label>
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="問綠寶…" className="flex-1 min-w-0 bg-bg-elevated border border-border rounded-full px-3 py-2 text-sm outline-none focus:border-accent" />
              <button onClick={send} disabled={busy} className="px-3 py-2 rounded-full bg-accent text-white text-sm disabled:opacity-40">送</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
