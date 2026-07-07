"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, History, Plus, X, Mic, Camera, Paperclip, Send, Target, Copy, Share2, PenLine, Check } from "lucide-react";
import { uploadMedia } from "@/lib/creator-upload";
import { useToast } from "@/components/ui/Toast";
import { useTranslations } from "next-intl";

type Msg = { role: "user" | "assistant"; content: string };
type FocusFrag = { id: string; title: string; content: string };

const BTN = 52; // 綠寶按鈕直徑(px)
const GREETING: Msg = { role: "assistant", content: "嗨，我是綠寶 ✨ 想做什麼作品？丟碎片、貼圖、或直接問我都可以。" };

export function IslandChat({ workspaceId, focusFragments = [], onClearFocus }: { workspaceId: string; focusFragments?: FocusFrag[]; onClearFocus?: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const t = useTranslations("creator");
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [text, setText] = useState("");
  const [img, setImg] = useState<{ data: string; mediaType: string; preview: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [weaving, setWeaving] = useState<number | null>(null);
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
    if (!SR) { toast.error(t("chatNoVoiceSupport")); return; }
    const r = new SR(); r.lang = "zh-TW"; r.interimResults = false;
    r.onresult = (e: any) => setText((prev) => (prev ? prev + " " : "") + e.results[0][0].transcript); r.start();
  }
  function pickImage(file: File) {
    const reader = new FileReader();
    reader.onload = () => { const url = String(reader.result); setImg({ data: url.split(",")[1], mediaType: file.type || "image/jpeg", preview: url }); };
    reader.readAsDataURL(file);
  }
  async function pickFile(file: File) {
    setBusy(true);
    try { const url = await uploadMedia(file); setText((prev) => `${prev}\n[附件 ${file.name}] ${url}`.trim()); } catch { toast.error(t("chatUploadFailed")); } finally { setBusy(false); }
  }
  async function send() {
    if (!text.trim() && !img) return;
    const userMsg: Msg = { role: "user", content: text.trim() || t("chatSeeThisImage") };
    const next = [...msgs, userMsg];
    setMsgs(next); setText(""); const image = img; setImg(null); setBusy(true);
    try {
      const focus = (focusFragments ?? []).slice(0, 8).map((f) => ({ title: f.title, content: (f.content || "").slice(0, 600) }));
      const r = await fetch("/api/creator-island/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })), image: image ? { data: image.data, mediaType: image.mediaType } : undefined, workspaceId, focusFragments: focus.length ? focus : undefined }),
      }).then((x) => x.json());
      const final: Msg[] = [...next, { role: "assistant", content: r.reply || r.message || t("chatNoReply") }];
      setMsgs(final);
      saveSession(final);
    } catch (e: any) { setMsgs((m) => [...m, { role: "assistant", content: t("chatError", { msg: e.message }) }]); } finally { setBusy(false); }
  }

  // === 訊息動作：複製 / 分享 / 接入創作（跟課程綠寶一致）===
  async function copyMsg(i: number, content: string) {
    try { await navigator.clipboard.writeText(content); setCopied(i); setTimeout(() => setCopied((c) => (c === i ? null : c)), 1500); } catch { /* ignore */ }
  }
  async function shareMsg(content: string) {
    try {
      if (navigator.share) await navigator.share({ text: content, title: t("chatShareTitle") });
      else { await navigator.clipboard.writeText(content); toast.success(t("chatCopiedForShare")); }
    } catch { /* 使用者取消分享 */ }
  }
  function firstLine(s: string) {
    const line = (s.split("\n").find((l) => l.trim()) ?? t("chatDefaultWorkTitle")).replace(/[#*`>_-]/g, "").trim();
    return line.slice(0, 60) || t("chatDefaultWorkTitle");
  }
  async function weaveMsg(i: number, content: string) {
    setWeaving(i);
    try {
      const r = await fetch("/api/creator-island/works", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, title: firstLine(content), body: content, fragmentIds: (focusFragments ?? []).map((f) => f.id), sourceType: "ai_assisted" }),
      }).then((x) => x.json());
      if (r.work?.id) router.push(`/creator-island/works/${r.work.id}`);
      else { setWeaving(null); toast.error(r.message || t("chatWeaveFailed")); }
    } catch (e: any) { setWeaving(null); toast.error(t("chatWeaveFailedMsg", { msg: e.message })); }
  }

  if (!pos) return null;

  return (
    <>
      {/* 可拖曳的綠寶按鈕（避開底部導覽列、點擊開關、長按拖動） */}
      <button
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
        title={t("chatAskEmeraldDrag")} style={{ left: pos.x, top: pos.y, touchAction: "none" }}
        className="fixed z-[55] h-[52px] px-4 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-black shadow-lg inline-flex items-center gap-1.5 font-bold hover:scale-105 transition select-none cursor-grab active:cursor-grabbing"><Sparkles size={18} /> {t("chatAskEmerald")}</button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.96 }}
            style={{ left: panel.left, top: panel.top, width: panel.width, height: panel.height }}
            className="fixed z-[56] bg-bg-card border border-emerald-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border flex items-center gap-2 bg-gradient-to-r from-emerald-500/10 to-transparent">
              <span className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-black grid place-items-center shadow-sm"><Sparkles size={16} /></span>
              <div className="leading-tight">
                <div className="font-bold text-sm">{t("chatMascotName")}</div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{t("chatMascotStatus")}</div>
              </div>
              <button onClick={() => { setShowHist((v) => !v); if (!showHist) loadSessions(); }} title={t("chatHistory")} className="ml-auto text-fg-muted hover:text-accent"><History size={16} /></button>
              <button onClick={newChat} title={t("chatNewChat")} className="text-fg-muted hover:text-accent"><Plus size={16} /></button>
              <button onClick={() => setOpen(false)} className="text-fg-muted hover:text-fg"><X size={16} /></button>
            </div>

            {showHist && (
              <div className="absolute inset-0 top-[49px] z-10 bg-bg-card overflow-y-auto p-2 space-y-1">
                <div className="text-xs text-fg-muted px-1 py-1 inline-flex items-center gap-1"><History size={13} /> {t("chatHistoryCount", { n: sessions.length })}</div>
                {sessions.length === 0 ? (
                  <div className="text-xs text-fg-muted px-1 py-4 text-center">{t("chatNoHistory")}</div>
                ) : sessions.map((s) => (
                  <div key={s.id} className="group flex items-center gap-1 rounded-lg hover:bg-bg-elevated">
                    <button onClick={() => openSession(s.id)} className="flex-1 min-w-0 text-left px-2 py-2 text-sm">
                      <div className="truncate">{s.title}</div>
                      <div className="text-[10px] text-fg-muted">{new Date(s.updated_at).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
                    </button>
                    <button onClick={() => delSession(s.id)} title={t("chatDelete")} className="px-2 text-fg-muted opacity-0 group-hover:opacity-100 hover:text-red-400"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-emerald-500/[0.04] to-transparent">
              {msgs.map((m, i) => (
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words bg-gradient-to-br from-emerald-400 to-teal-500 text-black shadow-sm">{m.content}</div>
                  </div>
                ) : (
                  <div key={i} className="flex items-end gap-2">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-black grid place-items-center shadow-sm"><Sparkles size={14} /></span>
                    <div className="max-w-[82%] min-w-0">
                      <div className="rounded-2xl rounded-bl-md px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words bg-bg-elevated border border-border text-fg shadow-sm">{m.content}</div>
                      {i > 0 && (
                        <div className="mt-1 flex items-center gap-1 pl-1">
                          <button onClick={() => copyMsg(i, m.content)} title={t("chatCopy")} className="text-[11px] text-fg-muted hover:text-accent inline-flex items-center gap-0.5">
                            {copied === i ? <><Check size={12} className="text-emerald-500" /> {t("chatCopied")}</> : <><Copy size={12} /> {t("chatCopy")}</>}
                          </button>
                          <button onClick={() => shareMsg(m.content)} title={t("chatShare")} className="text-[11px] text-fg-muted hover:text-accent inline-flex items-center gap-0.5"><Share2 size={12} /> {t("chatShare")}</button>
                          <button onClick={() => weaveMsg(i, m.content)} disabled={weaving !== null} title={t("chatWeaveTooltip")} className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:opacity-80 inline-flex items-center gap-0.5 disabled:opacity-40">
                            {weaving === i ? <Sparkles size={12} className="animate-spin" /> : <PenLine size={12} />} {t("chatWeave")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              ))}
              {busy && (
                <div className="flex items-end gap-2">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-black grid place-items-center shadow-sm"><Sparkles size={14} /></span>
                  <div className="rounded-2xl rounded-bl-md px-3.5 py-2.5 bg-bg-elevated border border-border inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
            {focusFragments.length > 0 && (
              <div className="px-3 pt-1.5 pb-0.5">
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2.5 py-1">
                  <Target size={12} className="shrink-0" />
                  <span className="truncate">{t("chatFocusPre")} <b>{focusFragments.length}</b> {t("chatFocusPost")}</span>
                  {onClearFocus && <button onClick={onClearFocus} title={t("chatClearFocus")} className="ml-auto shrink-0 hover:text-fg"><X size={12} /></button>}
                </div>
              </div>
            )}
            {img && <div className="px-3 pb-1"><img src={img.preview} className="h-14 rounded inline-block" /><button onClick={() => setImg(null)} className="text-xs text-fg-muted ml-2">{t("chatRemove")}</button></div>}
            <div className="p-2 border-t border-border flex items-center gap-1.5">
              <button onClick={voice} title={t("chatVoice")} className="hover:text-accent"><Mic size={18} /></button>
              <label title={t("chatImage")} className="cursor-pointer hover:text-accent"><Camera size={18} /><input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImage(f); e.currentTarget.value = ""; }} /></label>
              <label title={t("chatFile")} className="cursor-pointer hover:text-accent"><Paperclip size={18} /><input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.currentTarget.value = ""; }} /></label>
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={t("chatPlaceholder")} className="flex-1 min-w-0 bg-bg-elevated border border-border rounded-full px-3 py-2 text-sm outline-none focus:border-emerald-400 transition" />
              <button onClick={send} disabled={busy || (!text.trim() && !img)} title={t("chatSend")} className="shrink-0 w-9 h-9 grid place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-black shadow-sm hover:scale-105 active:scale-95 transition disabled:opacity-40 disabled:hover:scale-100"><Send size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
