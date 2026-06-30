"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, MessageSquareText, AtSign, ChevronDown, MessageSquare } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type CannedReply = {
  id: string;
  title: string;
  body: string;
  category: string | null;
  shortcut: string | null;
  use_count: number;
  owner_user_id: string | null;
};

/** 替換罐頭 body 中的變數：{{username}} → 實際名字 */
function applyVariables(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export function ReplyForm({
  ticketId,
  targetUserName,
  ticketSubject,
}: {
  ticketId: string;
  targetUserName: string;
  ticketSubject: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showCanned, setShowCanned] = useState(false);
  const [canned, setCanned] = useState<CannedReply[]>([]);
  const [loadingCanned, setLoadingCanned] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 載入罐頭（只首次展開時拉）
  useEffect(() => {
    if (!showCanned || canned.length > 0) return;
    setLoadingCanned(true);
    fetch("/api/admin/canned-replies")
      .then((r) => r.json())
      .then((j) => setCanned(j.replies ?? []))
      .catch(() => toast.error("罐頭載入失敗"))
      .finally(() => setLoadingCanned(false));
  }, [showCanned]);

  const insertAtCursor = (snippet: string) => {
    const el = textareaRef.current;
    if (!el) {
      setText((t) => t + snippet);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + snippet + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const applyCanned = async (c: CannedReply) => {
    const filled = applyVariables(c.body, {
      username: targetUserName,
      ticket_id: ticketId.slice(0, 8),
      ticket_subject: ticketSubject,
    });
    setText(filled);
    setShowCanned(false);
    // 統計用一次
    fetch(`/api/admin/canned-replies/${c.id}`, {
      credentials: "include",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ use_count_increment: 1 }),
    }).catch(() => {});
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const submit = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/reply`, {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "送出失敗");
      setText("");
      toast.success("已送出、user 會收到 LINE 通知（如果有綁定）");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "送出失敗");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="bg-bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> 回覆 <span className="text-xs text-fg-muted font-normal">→ {targetUserName}</span>
        </h2>
        <div className="flex items-center gap-2">
          {/* 罐頭下拉 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCanned((v) => !v)}
              className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-accent inline-flex items-center gap-1"
            >
              <MessageSquareText size={12} /> 罐頭訊息 <ChevronDown size={12} />
            </button>
            {showCanned && (
              <div className="absolute right-0 top-full mt-1 w-72 max-h-80 overflow-y-auto bg-bg-card border border-border rounded-xl shadow-2xl z-30">
                {loadingCanned ? (
                  <div className="p-4 text-center text-xs text-fg-muted">
                    <Loader2 size={14} className="animate-spin inline mr-1" />載入
                  </div>
                ) : canned.length === 0 ? (
                  <div className="p-4 text-center text-xs text-fg-muted">
                    還沒有罐頭、去 DB 加幾條常用模板
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {canned.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => applyCanned(c)}
                          className="w-full text-left px-3 py-2 hover:bg-bg-elevated transition"
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-accent">{c.title}</span>
                            {c.shortcut && (
                              <code className="text-[10px] text-fg-muted">/{c.shortcut}</code>
                            )}
                            {c.owner_user_id === null && (
                              <span className="text-[9px] px-1 rounded bg-blue-500/15 text-blue-900 dark:text-blue-200">共用</span>
                            )}
                          </div>
                          <div className="text-[11px] text-fg-muted line-clamp-2">{c.body}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* 插入 @user 名 */}
          <button
            type="button"
            onClick={() => insertAtCursor(`@${targetUserName} `)}
            className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-accent inline-flex items-center gap-1"
            title={`插入 @${targetUserName}`}
          >
            <AtSign size={12} /> 標 user
          </button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
        }}
        placeholder={`回覆 ${targetUserName}...（罐頭支援 {{username}} 等變數自動替換）`}
        rows={5}
        maxLength={5000}
        className="w-full bg-bg border border-border rounded-lg p-3 text-sm outline-none focus:border-accent resize-y"
      />

      <div className="flex items-center justify-between text-xs text-fg-muted">
        <span>{text.length} / 5000 · Cmd+Enter 送出</span>
        <button
          onClick={submit}
          disabled={!text.trim() || sending}
          className="px-4 py-1.5 rounded-full bg-accent text-black font-bold text-sm inline-flex items-center gap-1 disabled:opacity-50"
        >
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          送出回覆
        </button>
      </div>
    </section>
  );
}
