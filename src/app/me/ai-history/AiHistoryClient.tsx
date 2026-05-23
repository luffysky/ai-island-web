"use client";

import { useEffect, useState } from "react";
import { MessageSquare, ChevronRight, Loader2, Search } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
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
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Conv | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const filtered = initial.filter((c) => !filter || c.title.toLowerCase().includes(filter.toLowerCase()));

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
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full text-left p-3 hover:bg-bg-elevated transition ${selected?.id === c.id ? "bg-accent/10 border-l-2 border-accent" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <div className="text-base flex-shrink-0">
                    {c.persona_id ? PERSONA_ICON[c.persona_id]?.split(" ")[0] : "🤖"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.title}</div>
                    <div className="text-[10px] text-fg-muted">
                      {formatTW(c.updated_at)}
                      {c.context_chapter_id && ` · Ch ${c.context_chapter_id}`}
                    </div>
                  </div>
                  <ChevronRight size={12} className="text-fg-muted flex-shrink-0 mt-1" />
                </div>
              </button>
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
