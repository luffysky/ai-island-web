"use client";

import { useEffect, useState } from "react";
import { MessageSquare, ChevronRight, Loader2, Search, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatTW } from "@/lib/format-date";

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
        <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-fg-muted text-sm">
              {filter ? "沒符合的對話" : "還沒跟 AI 對話過"}
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
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
                    onClick={(e) => handleDelete(c, e)}
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
            ))
          )}
        </div>
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
          <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
            <div className="text-xs text-fg-muted pb-2 border-b border-border">
              {selected.title} · {formatTW(selected.created_at)}
              {selected.tone && ` · ${selected.tone}`}
              {selected.persona_id && ` · ${PERSONA_ICON[selected.persona_id] ?? selected.persona_id}`}
            </div>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg ${m.role === "user" ? "bg-accent/10 ml-8" : "bg-bg mr-8"}`}
              >
                <div className="text-[10px] text-fg-muted mb-1 flex items-center gap-2">
                  <span className="font-bold">{m.role === "user" ? "你" : "AI"}</span>
                  <span>{formatTW(m.created_at)}</span>
                  {m.model_used && <code className="bg-bg-elevated px-1 rounded">{m.model_used}</code>}
                </div>
                <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-center text-fg-muted text-sm py-8">此對話沒有訊息</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
