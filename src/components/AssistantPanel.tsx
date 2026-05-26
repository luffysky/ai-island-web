"use client";

import { useRef, useState } from "react";
import { Bot, X, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { ASSISTANT_LABEL, type AssistantMode } from "@/lib/ai-assistant";
import { useEdgeSafe } from "@/lib/use-edge-safe";

/**
 * 通用 AI 助教面板（小卡片浮層）
 * 可放在任何頁面、用 mode 指定行為
 *
 * 用法：
 *   <AssistantPanel mode="hint" placeholder="這題卡哪？" context={{ chapterId: 17 }} />
 */
export function AssistantPanel({
  mode,
  placeholder,
  context,
  inline = false,
  initialPrompt = "",
}: {
  mode: AssistantMode;
  placeholder?: string;
  context?: any;
  inline?: boolean;
  initialPrompt?: string;
}) {
  const meta = ASSISTANT_LABEL[mode];
  const [open, setOpen] = useState(inline);
  const [input, setInput] = useState(initialPrompt);
  const panelRef = useRef<HTMLDivElement>(null);
  useEdgeSafe(panelRef);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const ask = async () => {
    const msg = input.trim();
    if (!msg) return;
    setBusy(true);
    setReply("");
    try {
      const res = await fetch("/api/ai/assistant", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, message: msg, context }),
      });
      const j = await res.json();
      if (res.ok) setReply(j.text || "");
      else if (j.error === "quota_exceeded") toast.warning("今日免費額度用完、升級或自帶 key");
      else if (j.error === "rate_limited") toast.warning("問太快、稍後再試");
      else if (j.error === "no_system_key" || j.error === "no_model_available") toast.error("AI 尚未設定、聯絡管理員");
      else toast.error(j.message ?? j.error ?? "失敗");
    } catch { toast.error("網路錯誤"); }
    finally { setBusy(false); }
  };

  if (inline) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{meta.emoji}</span>
          <div>
            <h3 className="font-bold text-sm">{meta.name}</h3>
            <p className="text-[10px] text-fg-muted">{meta.desc}</p>
          </div>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder ?? "輸入要問的"}
          rows={3}
          className="w-full bg-bg border border-border rounded-lg p-2 text-sm mb-2"
        />
        <button
          onClick={ask}
          disabled={busy || !input.trim()}
          className="w-full py-2 rounded-lg bg-accent text-black font-bold text-sm disabled:opacity-40 inline-flex items-center justify-center gap-1"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {busy ? "思考中" : "問助教"}
        </button>
        {reply && (
          <div className="mt-3 p-3 rounded-lg bg-bg text-sm whitespace-pre-wrap leading-relaxed">
            {reply}
          </div>
        )}
      </div>
    );
  }

  // floating button + panel
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="fixed bottom-20 right-4 z-30 w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-lg flex items-center justify-center hover:scale-105">
        <Bot size={20} />
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      style={{ width: "clamp(280px, calc(100vw - 1rem), 420px)" }}
      className="fixed bottom-2 right-2 z-40 bg-bg-card border border-border rounded-2xl shadow-2xl"
    >
      <header className="px-4 py-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{meta.emoji}</span>
          <span className="font-bold text-sm">{meta.name}</span>
        </div>
        <button onClick={() => setOpen(false)} className="p-1 hover:bg-bg-elevated rounded"><X size={14} /></button>
      </header>
      <div className="p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder ?? meta.desc}
          rows={3}
          className="w-full bg-bg border border-border rounded-lg p-2 text-sm mb-2"
        />
        <button onClick={ask} disabled={busy || !input.trim()} className="w-full py-1.5 rounded-lg bg-accent text-black font-bold text-xs disabled:opacity-40 inline-flex items-center justify-center gap-1">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {busy ? "..." : "問"}
        </button>
        {reply && (
          <div className="mt-2 p-2 rounded-lg bg-bg text-xs whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
            {reply}
          </div>
        )}
      </div>
    </div>
  );
}
