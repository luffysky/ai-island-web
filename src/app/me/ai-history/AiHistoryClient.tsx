"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, ChevronRight, Loader2, Search, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatTW } from "@/lib/format-date";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CopyButton, TypingIndicator, ChatToolbar, formatChatTime } from "@/components/chat";

type Conv = {
  id: string;
  title: string;
  tone: string | null;
  persona_id: string | null;
  created_at: string;
  updated_at: string;
  context_chapter_id: number | null;
  context_lesson_id: string | null;
};

type Message = { role: string; content: string; created_at: string; model_used: string | null };

const PERSONA_ICON: Record<string, string> = {
  greenbao: "💎 綠寶",
  feizai: "🍔 肥仔",
  guba: "🍄 菇寶",
};

export function AiHistoryClient({ initial }: { initial: Conv[] }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Conv | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [conversations, setConversations] = useState<Conv[]>(initial);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [msgSearch, setMsgSearch] = useState("");

  const filtered = conversations.filter((c) => !filter || c.title.toLowerCase().includes(filter.toLowerCase()));

  const handleDelete = async (conv: Conv, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      title: "刪除這段對話？",
      description: `「${conv.title || "(無標題)"}」連同所有訊息會永久消失、無法復原。`,
      confirmLabel: "刪除",
      destructive: true,
    });
    if (!ok) return;

    setDeletingIds((s) => new Set(s).add(conv.id));
    // optimistic：先從列表拿掉、刪選中就清掉右側
    const snapshot = conversations;
    setConversations((cs) => cs.filter((c) => c.id !== conv.id));
    if (selected?.id === conv.id) {
      setSelected(null);
      setMessages([]);
    }

    try {
      const res = await fetch(`/api/me/ai-history/${conv.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("已刪除");
    } catch (err: any) {
      setConversations(snapshot);  // rollback
      toast.error("刪除失敗、請再試一次");
    } finally {
      setDeletingIds((s) => {
        const next = new Set(s);
        next.delete(conv.id);
        return next;
      });
    }
  };

  useEffect(() => {
    if (!selected) return;
    setLoadingMsgs(true);
    fetch(`/api/me/ai-history/${selected.id}/messages`)
      .then((r) => r.json())
      .then((j) => setMessages(j.messages ?? []))
      .catch(() => toast.error("載入訊息失敗"))
      .finally(() => setLoadingMsgs(false));
  }, [selected]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
      {/* 對話列表 */}
      <div className="rounded-xl bg-bg-card border border-border">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="搜尋對話..."
              className="w-full pl-7 pr-2 py-1.5 bg-bg border border-border rounded text-sm"
            />
          </div>
        </div>
        <VirtualConvList
          filtered={filtered}
          filter={filter}
          selected={selected}
          onSelect={setSelected}
          onDelete={handleDelete}
          deletingIds={deletingIds}
        />
      </div>

      {/* 對話內容 */}
      <div className="rounded-xl bg-bg-card border border-border min-h-[400px]">
        {!selected ? (
          <div className="text-center py-24 text-fg-muted">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">點左邊任一對話查看</p>
          </div>
        ) : loadingMsgs ? (
          <div className="text-center py-24 text-fg-muted">
            <Loader2 size={16} className="animate-spin inline mr-1" /> 載入中
          </div>
        ) : (
          <>
            {messages.length > 3 && (
              <ChatToolbar
                onSearch={setMsgSearch}
                exportText={messages.map((m) => `[${m.role === "user" ? "你" : "AI"}] ${formatChatTime(m.created_at)}\n${m.content}`).join("\n\n")}
                exportFileName={`${(selected.title || "ai-chat").replace(/[^\w-]+/g, "_")}-${new Date().toISOString().slice(0, 10)}.txt`}
                placeholder="搜尋這段對話內訊息..."
              />
            )}
            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              <div className="text-xs text-fg-muted pb-2 border-b border-border">
                {selected.title} · {formatChatTime(selected.created_at)}
                {selected.tone && ` · ${selected.tone}`}
                {selected.persona_id && ` · ${PERSONA_ICON[selected.persona_id] ?? selected.persona_id}`}
              </div>
              {messages
                .filter((m) => !msgSearch || m.content.toLowerCase().includes(msgSearch.toLowerCase()))
                .map((m, i) => (
                  <div
                    key={i}
                    className={`group/msg p-3 rounded-2xl relative shadow-sm hover:shadow-md transition-all animate-chat-bubble-in ${
                      m.role === "user"
                        ? "bg-gradient-to-br from-accent/15 to-accent-2/10 ml-8 border border-accent/20"
                        : "bg-gradient-to-br from-bg-elevated to-bg mr-8 border border-border/50 backdrop-blur-sm"
                    }`}
                  >
                    <div className="text-[10px] text-fg-muted mb-1 flex items-center gap-2">
                      <span className="font-bold">{m.role === "user" ? "你" : "AI"}</span>
                      <time title={new Date(m.created_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })} className="tabular-nums">
                        {formatChatTime(m.created_at)}
                      </time>
                      {m.model_used && <code className="bg-bg-elevated px-1 rounded">{m.model_used}</code>}
                      <span className="md:opacity-0 md:group-hover/msg:opacity-100 transition ml-auto">
                        <CopyButton text={m.content} size={10} />
                      </span>
                    </div>
                    <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                  </div>
                ))}
              {messages.length === 0 && (
                <div className="text-center text-fg-muted text-sm py-8">此對話沒有訊息</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function VirtualConvList({ filtered, filter, selected, onSelect, onDelete, deletingIds }: {
  filtered: Conv[];
  filter: string;
  selected: Conv | null;
  onSelect: (c: Conv) => void;
  onDelete: (c: Conv, e: React.MouseEvent) => void;
  deletingIds: Set<string>;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 68,
    overscan: 8,
  });

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-fg-muted text-sm">
        {filter ? "沒符合的對話" : "還沒跟 AI 對話過"}
      </div>
    );
  }

  return (
    <div ref={parentRef} style={{ maxHeight: 600, overflow: "auto" }}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const c = filtered[vi.index];
          return (
            <div
              key={c.id}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vi.start}px)` }}
              className="border-b border-border"
            >
              <div
                onClick={() => onSelect(c)}
                role="button"
                tabIndex={0}
                className={`group w-full text-left p-3 hover:bg-bg-elevated transition cursor-pointer ${selected?.id === c.id ? "bg-accent/10 border-l-2 border-accent" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <div className="text-base shrink-0">
                    {c.persona_id ? PERSONA_ICON[c.persona_id]?.split(" ")[0] : "🤖"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.title}</div>
                    <div className="text-[10px] text-fg-muted">
                      {formatTW(c.updated_at)}
                      {c.context_chapter_id && ` · Ch ${c.context_chapter_id}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => onDelete(c, e)}
                    disabled={deletingIds.has(c.id)}
                    aria-label="刪除對話"
                    title="刪除對話"
                    className="p-1.5 rounded text-fg-muted hover:text-red-400 hover:bg-red-500/10 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {deletingIds.has(c.id) ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                  <ChevronRight size={12} className="text-fg-muted shrink-0 mt-1" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
