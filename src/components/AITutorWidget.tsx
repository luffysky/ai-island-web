"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, X, ChevronDown, Settings as SettingsIcon, Plus, Loader2, History, MessageSquare } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import { PERSONA_LIST, getPersona, type PersonaId } from "@/lib/ai-personas";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { linkifyChapterRefs } from "@/lib/linkify-chapters";
import { CodeBlock } from "@/components/chapter/CodeBlock";

const TONE_OPTIONS = [
  { value: "friendly", label: "😊 親切" },
  { value: "concise", label: "🎯 簡短" },
  { value: "detailed", label: "📚 詳細" },
  { value: "tutor", label: "🧑‍🏫 引導" },
  { value: "casual_tw", label: "🇹🇼 台味" },
  { value: "pro", label: "💼 專業" },
];

interface AIModel {
  id: string;
  provider: string;
  model_name: string;
  display_name: string;
  description: string;
  is_default: boolean;
  free_tier_daily_limit: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AITutorWidget({
  contextChapterId,
  contextLessonId,
}: {
  contextChapterId?: number;
  contextLessonId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [tone, setTone] = useState("friendly");
  const [personaId, setPersonaId] = useState<PersonaId>("green");
  const persona = getPersona(personaId);
  const [useBYOK, setUseBYOK] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [quotaUsed, setQuotaUsed] = useState<{ used: number; limit: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; title: string; updated_at: string }>>([]);
  // 用全站 AuthContext、不再自己 race
  const { status: authState } = useAuth();
  const isLoggedIn = authState === "in";
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createSupabaseBrowser();

  // 載入模型清單（不依賴登入狀態；anon 也讀得到 is_active=true）
  useEffect(() => {
    (async () => {
      const { data, error: modelsError } = await supabase
        .from("ai_models")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (modelsError) {
        console.error("[AI tutor] load models failed:", modelsError);
        setError("AI 模型清單載入失敗");
        return;
      }
      console.log("[AI tutor] models loaded:", data?.length ?? 0, "rows");
      if (data) {
        setModels(data);
        const def = data.find((m: any) => m.is_default) || data[0];
        if (def) setSelectedModelId(def.id);
        if (data.length === 0) {
          setError("目前沒有可用 AI 模型，請到後台啟用至少一個模型");
        }
      }
    })();
  }, []);

  // 登入後（或登入狀態切換時）載入今日 quota
  useEffect(() => {
    if (authState !== "in") {
      setQuotaUsed(null);
      return;
    }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date().toISOString().slice(0, 10);
      const { data: q, error: quotaError } = await supabase
        .from("ai_daily_quota")
        .select("free_used")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();
      if (quotaError) {
        console.error("[AI tutor] load quota failed:", quotaError);
      }
      const def = models.find((m: any) => m.is_default);
      setQuotaUsed({ used: q?.free_used ?? 0, limit: def?.free_tier_daily_limit ?? 10 });
    })();
  }, [authState, models]);

  // 自動 scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    if (!isLoggedIn) {
      setError("請先登入才能使用 AI 導師");
      return;
    }
    if (!selectedModelId) {
      setError("目前沒有可用 AI 模型，請稍後再試");
      return;
    }

    const userMsg = input.trim();
    setInput("");
    setError("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }, { role: "assistant", content: "" }]);
    setSending(true);

    try {
      // 島嶼每日學習任務（client-only）
      import("@/components/island/island-bus").then((m) => m.bumpQuest("ai_chat", 1)).catch(() => {});
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          modelId: selectedModelId,
          message: userMsg,
          tone,
          contextChapterId,
          contextLessonId,
          useBYOK,
          personaId,
        }),
      });

      // 非 200 = error JSON
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || data.error || "發生錯誤");
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: `❌ ${data.message || data.error}` };
          return copy;
        });
        setSending(false);
        return;
      }

      // 200 = SSE stream
      if (!res.body) throw new Error("no_body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;
          try {
            const json = JSON.parse(data);
            if (json.type === "init") {
              setConversationId(json.conversationId);
            } else if (json.type === "text") {
              accumulated += json.text;
              // 更新最後一則 message
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: accumulated };
                return copy;
              });
            } else if (json.type === "done") {
              if (!useBYOK && quotaUsed) {
                setQuotaUsed({ ...quotaUsed, used: quotaUsed.used + 1 });
              }
              // quest 進度
              fetch("/api/quests/progress", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "ai_chat", delta: 1 }),
              }).catch(() => {});
            } else if (json.type === "error") {
              setError(json.error);
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: `❌ ${json.error}` };
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const newChat = () => {
    setMessages([]);
    setConversationId(null);
    setError("");
  };

  const selectedModel = models.find((m) => m.id === selectedModelId);

  return (
    <>
      {/* Floating button - 綠寶導師 */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-green-400 via-emerald-400 to-cyan-400 text-black shadow-2xl hover:scale-110 transition flex items-center justify-center group"
          title="綠寶 — 你的 AI 學習導師"
          aria-label="開啟 AI 導師"
        >
          <span className="text-2xl group-hover:scale-110 transition" aria-hidden>
            ✨
          </span>
          <span className="absolute -bottom-1 right-0 text-[8px] bg-black text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">
            綠寶 🐹
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-3rem)] bg-bg-card border border-border rounded-2xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-base flex-shrink-0">
                ✨
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm flex items-center gap-1">
                  {persona.emoji} {persona.name}
                  {contextChapterId && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full ml-1">
                      📚 Ch{String(contextChapterId).padStart(2, "0")}
                    </span>
                  )}
                </div>
                {selectedModel && (
                  <div className="text-xs text-fg-muted truncate">{selectedModel.display_name}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={async () => {
                  setShowHistory(!showHistory);
                  if (!showHistory && isLoggedIn) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      const { data } = await supabase
                        .from("ai_conversations")
                        .select("id, title, updated_at")
                        .eq("user_id", user.id)
                        .order("updated_at", { ascending: false })
                        .limit(20);
                      setHistory(data ?? []);
                    }
                  }
                }}
                className={`p-1.5 rounded ${showHistory ? "bg-bg-elevated" : "hover:bg-bg-elevated"}`}
                title="對話紀錄"
              >
                <History size={16} />
              </button>
              <button onClick={newChat} className="p-1.5 hover:bg-bg-elevated rounded" title="新對話">
                <Plus size={16} />
              </button>
              <button
                onClick={() => {
                  setShowSettings(!showSettings);
                  setShowModelMenu(false);
                }}
                className={`p-1.5 rounded ${showSettings ? "bg-bg-elevated" : "hover:bg-bg-elevated"}`}
              >
                <SettingsIcon size={16} />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-bg-elevated rounded">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* History panel */}
          {showHistory && (
            <div className="border-b border-border bg-bg max-h-[300px] overflow-y-auto">
              <div className="p-2 text-xs text-fg-muted sticky top-0 bg-bg">
                最近 20 個對話
              </div>
              {history.length === 0 ? (
                <div className="p-4 text-center text-xs text-fg-muted">沒有對話紀錄</div>
              ) : (
                history.map((h) => (
                  <button
                    key={h.id}
                    onClick={async () => {
                      // 載入該對話的訊息
                      const { data } = await supabase
                        .from("ai_messages")
                        .select("role, content")
                        .eq("conversation_id", h.id)
                        .order("created_at", { ascending: true });
                      setMessages((data ?? []).filter((m: any) => m.role !== "system").map((m: any) => ({ role: m.role, content: m.content })));
                      setConversationId(h.id);
                      setShowHistory(false);
                    }}
                    className="w-full text-left p-2 hover:bg-bg-elevated text-sm border-t border-border"
                  >
                    <div className="truncate flex items-center gap-1">
                      <MessageSquare size={12} className="text-fg-muted flex-shrink-0" />
                      <span className="truncate">{h.title || "(無標題)"}</span>
                    </div>
                    <div className="text-xs text-fg-muted mt-0.5">
                      {new Date(h.updated_at).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Settings panel */}
          {showSettings && (
            <div className="relative z-20 p-3 border-b border-border bg-bg space-y-3 text-sm overflow-visible">
              <div>
                <label className="text-xs text-fg-muted mb-1 block">夥伴</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {PERSONA_LIST.map((p) => {
                    const active = personaId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPersonaId(p.id)}
                        className={`p-2 rounded-lg border text-left transition ${
                          active
                            ? "border-accent bg-accent/10"
                            : "border-border bg-bg-card hover:border-accent/50"
                        }`}
                      >
                        <div className="text-lg leading-none">{p.emoji}</div>
                        <div className="font-bold text-xs mt-1">{p.name}</div>
                        <div className="text-[10px] text-fg-muted leading-tight mt-0.5 line-clamp-2">
                          {p.role}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-fg-muted mt-1.5 leading-snug">
                  {persona.short}
                </p>
              </div>

              <div className="relative z-30">
                <label className="text-xs text-fg-muted mb-1 block">AI 模型</label>
                <button
                  type="button"
                  onClick={() => setShowModelMenu(!showModelMenu)}
                  className="w-full flex items-center justify-between gap-2 bg-bg-card border border-border rounded p-2 text-sm text-left"
                >
                  <span className="truncate">
                    {selectedModel ? `${selectedModel.display_name} (${selectedModel.provider})` : "選擇 AI 模型"}
                  </span>
                  <ChevronDown size={14} className={`shrink-0 transition ${showModelMenu ? "rotate-180" : ""}`} />
                </button>
                {models.length === 0 && (
                  <p className="text-xs text-red-400 mt-1">
                    沒有可用模型。請強制刷新（Ctrl+Shift+R）；若仍無、檢查瀏覽器 console 是否有錯誤
                  </p>
                )}
                {showModelMenu && (
                  <ul className="absolute left-0 right-0 top-[calc(100%+4px)] z-[80] max-h-56 overflow-y-auto rounded-lg border border-border bg-bg-card shadow-2xl">
                    {models.length === 0 ? (
                      <li className="px-3 py-2 text-xs text-fg-muted">沒有可用模型</li>
                    ) : (
                      models.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedModelId(m.id);
                              setShowModelMenu(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-bg-elevated ${
                              selectedModelId === m.id ? "text-accent" : ""
                            }`}
                          >
                            <div className="font-medium">{m.display_name}</div>
                            <div className="text-xs text-fg-muted">{m.provider} / {m.model_name}</div>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
                {selectedModel?.description && (
                  <p className="text-xs text-fg-muted mt-1">{selectedModel.description}</p>
                )}
              </div>

              <div>
                <label className="text-xs text-fg-muted mb-1 block">語氣</label>
                <div className="grid grid-cols-3 gap-1">
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTone(t.value)}
                      className={`text-xs px-2 py-1 rounded ${tone === t.value ? "bg-accent text-black font-semibold" : "bg-bg-card hover:bg-bg-elevated"}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={useBYOK} onChange={(e) => setUseBYOK(e.target.checked)} />
                  用我自己的 API key（無限額度、先到設定建立）
                </label>
              </div>

              {!useBYOK && quotaUsed && (
                <div className="text-xs text-fg-muted">
                  今日免費額度：{quotaUsed.used} / {quotaUsed.limit}
                  <div className="h-1 bg-bg-card rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${(quotaUsed.used / Math.max(quotaUsed.limit, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-fg-muted text-sm py-8">
                <Sparkles size={32} className="mx-auto mb-2 opacity-50" />
                <p className="font-medium mb-1">AI 學習導師</p>
                <p className="text-xs">問我任何 AI 島課程的問題</p>
                <div className="mt-4 space-y-1 text-xs">
                  <SuggestedQ onPick={setInput}>什麼是 RAG？</SuggestedQ>
                  <SuggestedQ onPick={setInput}>怎麼從 0 開始學 Next.js？</SuggestedQ>
                  <SuggestedQ onPick={setInput}>給我一個 React Hook 範例</SuggestedQ>
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-accent text-black"
                    : "bg-bg-elevated text-fg"
                }`}>
                  {m.role === "assistant" ? (
                    <div className="prose-custom prose-sm min-w-0">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, rehypeHighlight]}
                        components={{
                          // 在 p / li / strong / em 內處理 chapter refs
                          p: ({ children }) => <p>{linkifyChildren(children)}</p>,
                          li: ({ children }) => <li>{linkifyChildren(children)}</li>,
                          strong: ({ children }) => <strong>{linkifyChildren(children)}</strong>,
                          em: ({ children }) => <em>{linkifyChildren(children)}</em>,
                          // code block 用 CodeBlock（含複製鍵）
                          pre: ({ children }) => {
                            const codeEl = (children as any)?.props ?? {};
                            return <CodeBlock className={codeEl.className}>{children}</CodeBlock>;
                          },
                          code: ({ className, children, ...props }: any) => {
                            const isInline = !className?.includes("language-");
                            if (isInline) {
                              return (
                                <code
                                  className="px-1.5 py-0.5 rounded bg-black/30 text-warning text-[0.9em] font-mono"
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            }
                            return <code className={className} {...props}>{children}</code>;
                          },
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                      {m.role === "assistant" && !m.content && sending && (
                        <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-0.5"></span>
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-bg-elevated rounded-2xl px-3 py-2">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="px-3 py-2 text-xs text-red-400 bg-red-500/10 border-t border-red-500/30">
              {error}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={
                  authState === "loading"
                    ? "載入中..."
                    : authState === "in"
                    ? "問點什麼..."
                    : "請先登入"
                }
                disabled={authState !== "in" || sending}
                rows={1}
                className="flex-1 bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent resize-none"
                style={{ maxHeight: "120px" }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending || authState !== "in"}
                className="p-2 bg-accent text-black rounded-lg hover:scale-105 transition disabled:opacity-30 disabled:hover:scale-100"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SuggestedQ({ onPick, children }: { onPick: (q: string) => void; children: string }) {
  return (
    <button
      onClick={() => onPick(children)}
      className="block w-full text-left px-3 py-1.5 bg-bg-elevated hover:bg-bg-card rounded-lg text-xs"
    >
      💬 {children}
    </button>
  );
}

// 遞迴處理 ReactMarkdown 的 children、把字串內的章節引用變連結
function linkifyChildren(children: any): any {
  if (typeof children === "string") {
    return linkifyChapterRefs(children);
  }
  if (Array.isArray(children)) {
    return children.map((c, i) => {
      if (typeof c === "string") {
        return <span key={i}>{linkifyChapterRefs(c)}</span>;
      }
      return c;
    });
  }
  return children;
}
