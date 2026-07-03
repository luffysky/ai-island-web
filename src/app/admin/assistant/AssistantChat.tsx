"use client";

import { useRef, useState } from "react";
import { Bot, Send, Sparkles, User, Loader2, Database, AlertTriangle } from "lucide-react";

type DataUsed = { name: string; args: Record<string, any>; result?: any; error?: string };
type Msg = {
  role: "user" | "assistant";
  text: string;
  dataUsed?: DataUsed[];
  error?: boolean;
};

export function AssistantChat({
  suggestions,
  capabilities,
}: {
  suggestions: string[];
  capabilities: string[];
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: data?.message || data?.error || "出錯了、請再試一次", error: true },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: data.answer ?? "（沒有回應）", dataUsed: data.dataUsed ?? [] },
        ]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "網路錯誤、請再試一次", error: true }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }));
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
      {/* 對話區 */}
      <div className="bg-bg-card border border-border rounded-2xl flex flex-col min-h-[520px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[62vh]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-fg-muted py-10">
              <Bot className="w-10 h-10 mb-3 text-violet-400" />
              <p className="font-bold text-fg">問我營運數據</p>
              <p className="text-sm mt-1">例如「今天賺了多少？」「近 7 天新增幾個用戶？」</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-md">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-bg-elevated hover:border-accent hover:text-accent transition inline-flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => <Bubble key={i} msg={m} />)
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-fg-muted">
              <Loader2 className="w-4 h-4 animate-spin" /> 查詢 + 分析中…
            </div>
          )}
        </div>

        {/* 輸入列 */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="border-t border-border p-3 flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="問營運數據… 例如：本月營收多少？"
            disabled={loading}
            className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded-lg bg-accent text-black font-bold text-sm inline-flex items-center gap-1.5 disabled:opacity-40"
          >
            <Send className="w-4 h-4" /> 送出
          </button>
        </form>
      </div>

      {/* 側欄：建議 + 能力範圍 */}
      <div className="space-y-3">
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wider text-fg-muted mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> 快速提問
          </div>
          <div className="flex flex-col gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                disabled={loading}
                className="text-left text-xs px-3 py-2 rounded-lg bg-bg-elevated hover:bg-border hover:text-accent transition disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wider text-fg-muted mb-2">我能回答</div>
          <ul className="text-xs text-fg-muted space-y-1 list-disc pl-4">
            {capabilities.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
          isUser ? "bg-accent/20 text-accent" : "bg-violet-500/20 text-violet-400"
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={`min-w-0 max-w-[85%] ${isUser ? "text-right" : ""}`}>
        <div
          className={`inline-block text-left rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
            isUser
              ? "bg-accent text-black"
              : msg.error
                ? "bg-red-500/10 border border-red-500/30 text-red-200"
                : "bg-bg-elevated border border-border"
          }`}
        >
          {msg.error && <AlertTriangle className="inline-block align-[-2px] w-3.5 h-3.5 mr-1" />}
          {msg.text}
        </div>
        {msg.dataUsed && msg.dataUsed.length > 0 && (
          <details className="mt-1.5 text-left">
            <summary className="cursor-pointer text-[11px] text-fg-muted hover:text-accent inline-flex items-center gap-1">
              <Database className="w-3 h-3" /> 查了 {msg.dataUsed.length} 項數據（點看原始數字）
            </summary>
            <div className="mt-1.5 space-y-1.5">
              {msg.dataUsed.map((d, i) => (
                <div key={i} className="rounded-lg bg-bg border border-border p-2">
                  <div className="text-[11px] font-mono text-accent">
                    {d.name}
                    {d.args && Object.keys(d.args).length > 0 && (
                      <span className="text-fg-muted"> ({JSON.stringify(d.args)})</span>
                    )}
                  </div>
                  {d.error ? (
                    <div className="text-[11px] text-red-400 mt-0.5">錯誤：{d.error}</div>
                  ) : (
                    <pre className="text-[10px] text-fg-muted mt-1 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(d.result, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
