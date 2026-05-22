"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send } from "lucide-react";
import { getSpecies, type SpeciesId } from "@/lib/pet-species";

type Message = { role: "user" | "pet"; content: string };

export function PetChatPanel({
  pet,
  onClose,
  onMessageSent,
}: {
  pet: { name: string; species: SpeciesId };
  onClose: () => void;
  onMessageSent?: (text: string) => void;
}) {
  const species = getSpecies(pet.species);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // 載入歷史
  useEffect(() => {
    fetch("/api/pet/chat")
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j.messages)) setMessages(j.messages);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", content: userMsg }, { role: "pet", content: "" }]);
    setSending(true);

    try {
      const res = await fetch("/api/pet/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, path: window.location.pathname }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "失敗");
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "pet", content: `❌ ${data.error}` };
          return copy;
        });
        setSending(false);
        return;
      }

      // SSE stream
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
        for (const ln of lines) {
          if (!ln.startsWith("data: ")) continue;
          const data = ln.slice(6).trim();
          if (!data) continue;
          try {
            const json = JSON.parse(data);
            if (json.type === "text") {
              accumulated += json.text;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "pet", content: accumulated };
                return copy;
              });
            }
          } catch {}
        }
      }
      onMessageSent?.(accumulated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[440px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <div className="text-2xl">{species.emoji}</div>
          <div>
            <div className="text-sm font-bold">{pet.name}</div>
            <div className="text-[10px] text-[var(--color-fg-muted)]">{species.name} · {species.voiceHint.slice(0, 16)}…</div>
          </div>
        </div>
        <button onClick={onClose} className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-[var(--color-fg-muted)] mt-12">
            跟 {pet.name} 聊聊。會記得你的學習狀態。
          </div>
        ) : null}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-[var(--color-accent)] text-black"
                  : "bg-[var(--color-bg-elevated)]"
              }`}
            >
              {m.content || (sending && i === messages.length - 1 ? "..." : "")}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="px-3 py-1.5 text-xs text-red-400 bg-red-500/10 border-t border-red-500/30">
          {error}
        </div>
      )}

      <div className="p-3 border-t border-[var(--color-border)] flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={`跟 ${pet.name} 說...`}
          disabled={sending}
          className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className="p-2 bg-[var(--color-accent)] text-black rounded-lg disabled:opacity-30"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
