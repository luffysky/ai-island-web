"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { uploadMedia } from "@/lib/creator-upload";

type Msg = { role: "user" | "assistant"; content: string };

export function IslandChat({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "嗨，我是綠寶 ✨ 想做什麼作品？丟碎片、貼圖、或直接問我都可以。" }]);
  const [text, setText] = useState("");
  const [img, setImg] = useState<{ data: string; mediaType: string; preview: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

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
      setMsgs((m) => [...m, { role: "assistant", content: r.reply || r.message || "（沒有回覆）" }]);
    } catch (e: any) { setMsgs((m) => [...m, { role: "assistant", content: "出錯了：" + e.message }]); } finally { setBusy(false); }
  }

  return (
    <>
      <button onClick={() => setOpen((o) => !o)} title="問綠寶"
        className="fixed bottom-4 left-4 z-30 h-12 px-4 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-black shadow-lg grid place-items-center font-bold hover:scale-105 transition">✨ 問綠寶</button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="fixed bottom-20 left-4 z-40 w-[min(92vw,380px)] h-[min(70vh,560px)] bg-bg-card border border-emerald-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border flex items-center gap-2">
              <span className="font-bold">✨ 綠寶</span><span className="text-xs text-fg-muted">創作夥伴</span>
              <button onClick={() => setOpen(false)} className="ml-auto text-fg-muted hover:text-fg">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {msgs.map((m, i) => (
                <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "ml-auto bg-accent text-white" : "bg-bg-elevated"}`}>{m.content}</div>
              ))}
              {busy && <div className="text-xs text-fg-muted animate-pulse">綠寶思考中…</div>}
              <div ref={endRef} />
            </div>
            {img && <div className="px-3 pb-1"><img src={img.preview} className="h-14 rounded inline-block" /><button onClick={() => setImg(null)} className="text-xs text-fg-muted ml-2">移除</button></div>}
            <div className="p-2 border-t border-border flex items-center gap-1.5">
              <button onClick={voice} title="語音" className="text-lg hover:text-accent">🎤</button>
              <label title="圖片(可看圖)" className="text-lg cursor-pointer hover:text-accent">📷<input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImage(f); e.currentTarget.value = ""; }} /></label>
              <label title="檔案" className="text-lg cursor-pointer hover:text-accent">📎<input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.currentTarget.value = ""; }} /></label>
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="問綠寶…" className="flex-1 bg-bg-elevated border border-border rounded-full px-3 py-2 text-sm outline-none focus:border-accent" />
              <button onClick={send} disabled={busy} className="px-3 py-2 rounded-full bg-accent text-white text-sm disabled:opacity-40">送</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
