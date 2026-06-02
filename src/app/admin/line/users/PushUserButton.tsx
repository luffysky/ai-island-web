"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, X, MessageSquareText } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export function PushUserButton({
  userId,
  userName,
  notifyEnabled,
}: {
  userId: string;
  userName: string;
  notifyEnabled: boolean;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showCanned, setShowCanned] = useState(false);
  const [canned, setCanned] = useState<any[]>([]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!showCanned || canned.length > 0) return;
    fetch("/api/admin/canned-replies")
      .then((r) => r.json())
      .then((j) => setCanned(j.replies ?? []));
  }, [showCanned]);

  const applyCanned = (c: any) => {
    const filled = c.body.replace(/\{\{username\}\}/g, userName).replace(/\{\{ticket_id\}\}/g, "").replace(/\{\{ticket_subject\}\}/g, "");
    setText(filled);
    setShowCanned(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/line/push-user", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, text: body }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || j.message || "推送失敗");
      toast.success("已推送");
      setText("");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "推送失敗");
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded-full bg-accent text-black font-bold inline-flex items-center gap-1 hover:scale-105 transition flex-shrink-0"
      >
        <Send size={11} /> 推訊息
      </button>
    );
  }

  return (
    <div className="w-full mt-3 bg-bg-elevated rounded-lg p-3 space-y-2 basis-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">推訊息給 {userName}</span>
        <button onClick={() => setOpen(false)} className="p-1 text-fg-muted hover:text-fg">
          <X size={14} />
        </button>
      </div>
      {!notifyEnabled && (
        <div className="text-[10px] text-yellow-400 bg-yellow-500/10 rounded p-1.5">
          ⚠️ 此 user 已關「收 LINE 通知」、推下去 notifyUserLine 會被擋。可直接從這推測試（會 bypass user 設定）
        </div>
      )}
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="寫訊息..."
        rows={3}
        className="w-full bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent resize-y"
        maxLength={4900}
      />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="relative">
          <button
            onClick={() => setShowCanned((v) => !v)}
            className="text-[10px] px-2 py-1 rounded-full border border-border hover:border-accent inline-flex items-center gap-1"
          >
            <MessageSquareText size={10} /> 罐頭
          </button>
          {showCanned && (
            <div className="absolute left-0 top-full mt-1 w-64 max-h-60 overflow-y-auto bg-bg-card border border-border rounded-xl shadow-2xl z-30">
              {canned.length === 0 ? (
                <div className="p-3 text-center text-xs text-fg-muted">載入...</div>
              ) : (
                <ul className="divide-y divide-border">
                  {canned.map((c: any) => (
                    <li key={c.id}>
                      <button
                        onClick={() => applyCanned(c)}
                        className="w-full text-left px-3 py-2 hover:bg-bg-elevated"
                      >
                        <div className="text-xs font-bold text-accent">{c.title}</div>
                        <div className="text-[10px] text-fg-muted line-clamp-2">{c.body}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="text-xs px-4 py-1.5 rounded-full bg-accent text-black font-bold inline-flex items-center gap-1 disabled:opacity-50"
        >
          {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          推送
        </button>
      </div>
    </div>
  );
}
