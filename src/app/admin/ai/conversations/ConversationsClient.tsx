"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, X, MessageSquare, Crown } from "lucide-react";
import { formatTW } from "@/lib/format-date";

type Conv = {
  id: string;
  title: string | null;
  tone: string | null;
  use_byok: boolean | null;
  updated_at: string;
  profiles: { username?: string | null; display_name?: string | null } | null;
};

type Message = {
  role: string;
  content: string;
  created_at: string;
  model_used: string | null;
  tokens_input?: number | null;
  tokens_output?: number | null;
  cost_usd?: number | null;
};

const PERSONA: Record<string, string> = {
  greenbao: "💎 綠寶",
  feizai: "🍔 肥仔",
  guba: "🍄 菇寶",
};

export function ConversationsClient({ convs, isOwner }: { convs: Conv[]; isOwner: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [convDetail, setConvDetail] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/ai/conversations/${selectedId}/messages`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.message || j.error || `HTTP ${r.status}`);
        return j;
      })
      .then((j) => {
        setConvDetail(j.conv);
        setMessages(j.messages ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedId]);

  return (
    <>
      <div className="bg-bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated text-left text-xs text-fg-muted uppercase">
            <tr>
              <th className="px-4 py-3">主題</th>
              <th className="px-4 py-3">用戶</th>
              <th className="px-4 py-3">語氣</th>
              <th className="px-4 py-3">BYOK</th>
              <th className="px-4 py-3">最後更新</th>
              {isOwner && <th className="px-4 py-3 w-24"></th>}
            </tr>
          </thead>
          <tbody>
            {convs.length === 0 ? (
              <tr><td colSpan={isOwner ? 6 : 5} className="px-4 py-8 text-center text-fg-muted">沒有對話</td></tr>
            ) : (
              convs.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-bg-elevated">
                  <td className="px-4 py-3 max-w-xs truncate">{c.title || "(無標題)"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users?q=${c.profiles?.username}` as any} className="hover:text-accent">
                      {c.profiles?.display_name || c.profiles?.username || "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs">{c.tone}</td>
                  <td className="px-4 py-3 text-xs">{c.use_byok ? "✓" : "—"}</td>
                  <td className="px-4 py-3 text-xs text-fg-muted">{new Date(c.updated_at).toLocaleString("zh-TW")}</td>
                  {isOwner && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedId(c.id)}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:border-accent hover:text-accent"
                      >
                        <MessageSquare size={11} /> 看內容
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Owner-only：對話內容 drawer */}
      {isOwner && selectedId && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="bg-bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 bg-bg-card rounded-t-2xl">
              <h3 className="font-bold inline-flex items-center gap-2">
                <Crown size={14} className="text-yellow-400" /> 完整對話內容
                <span className="text-[10px] text-fg-muted font-normal">(owner 限定)</span>
              </h3>
              <button onClick={() => setSelectedId(null)} className="p-1 text-fg-muted hover:text-fg">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="text-center py-12 text-fg-muted">
                  <Loader2 size={20} className="animate-spin inline mr-1" /> 載入中
                </div>
              ) : error ? (
                <div className="text-center py-8 text-sm text-red-400 bg-red-500/10 rounded-lg p-4">
                  {error}
                </div>
              ) : (
                <>
                  {convDetail && (
                    <div className="text-xs text-fg-muted pb-3 border-b border-border space-y-1">
                      <div className="font-semibold text-sm text-fg">{convDetail.title || "(無標題)"}</div>
                      <div>
                        用戶：{convDetail.profiles?.display_name || convDetail.profiles?.username || "—"} ·
                        建立：{formatTW(convDetail.created_at)}
                      </div>
                      <div>
                        {convDetail.tone && <>語氣：{convDetail.tone} · </>}
                        {convDetail.persona_id && <>夥伴：{PERSONA[convDetail.persona_id] ?? convDetail.persona_id} · </>}
                        {convDetail.context_chapter_id && <>章節：Ch{convDetail.context_chapter_id}</>}
                        {convDetail.context_lesson_id && <> / L{convDetail.context_lesson_id}</>}
                        {convDetail.use_byok && <> · BYOK</>}
                      </div>
                    </div>
                  )}

                  {messages.length === 0 ? (
                    <div className="text-center text-fg-muted text-sm py-8">此對話沒有訊息</div>
                  ) : (
                    messages.map((m, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg ${m.role === "user" ? "bg-accent/10 ml-8" : "bg-bg-elevated mr-8"}`}
                      >
                        <div className="text-[10px] text-fg-muted mb-1 flex items-center gap-2 flex-wrap">
                          <span className="font-bold">{m.role === "user" ? "用戶" : "AI"}</span>
                          <span>{formatTW(m.created_at)}</span>
                          {m.model_used && <code className="bg-bg px-1 rounded">{m.model_used}</code>}
                          {(m.tokens_input ?? 0) + (m.tokens_output ?? 0) > 0 && (
                            <span className="text-fg-muted">
                              {m.tokens_input}↓ / {m.tokens_output}↑ tokens
                              {m.cost_usd ? ` · $${Number(m.cost_usd).toFixed(4)}` : ""}
                            </span>
                          )}
                        </div>
                        <div className="text-sm whitespace-pre-wrap break-words">{m.content || <span className="text-fg-muted italic">(空)</span>}</div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
