"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send } from "lucide-react";
import { getSpecies, type SpeciesId } from "@/lib/pet-species";
import { useAuth } from "@/lib/auth-context";
import { getVipTier, pickHonorific } from "@/lib/pet-vip";
import { pickChatter, type ChatterCtx } from "@/lib/pet-chatter";
import { useEdgeSafe } from "@/lib/use-edge-safe";

type Message = { role: "user" | "pet"; content: string };

const SECRET_LUFFY = /^(董事長|林董|林老闆|林總|頭家|luffy)[!！。.?？\s]*$/i;
const SECRET_NAMI = /^(nami|nami\s*姊|nami\s*大人|親愛的\s*nami)[!！。.?？\s]*$/i;

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
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const recentRef = useRef<Set<string>>(new Set());
  useEdgeSafe(panelRef);

  const ctx: ChatterCtx | null = profile
    ? {
        species: pet.species,
        vip: getVipTier(profile),
        hour: new Date().getHours(),
        recent: recentRef.current,
        honorific: pickHonorific(getVipTier(profile), profile.display_name),
        level: profile.level ?? 1,
        xp: profile.xp ?? 0,
        streak: profile.streak_days ?? 0,
        petName: pet.name,
      }
    : null;

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

    // 隱藏指令：不打 API、純本地腳本回應、不耗 AI 配額
    if (ctx) {
      let secretKind: "secret-luffy" | "secret-nami" | null = null;
      if (SECRET_LUFFY.test(userMsg)) secretKind = "secret-luffy";
      else if (SECRET_NAMI.test(userMsg)) secretKind = "secret-nami";
      if (secretKind) {
        const reply = pickChatter(secretKind, ctx) ?? "♡";
        setMessages((m) => [
          ...m,
          { role: "user", content: userMsg },
          { role: "pet", content: reply },
        ]);
        onMessageSent?.(reply);
        return;
      }
    }

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
    <div ref={panelRef} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[360px] max-w-[calc(100vw-1rem)] h-[440px] max-h-[calc(100vh-1rem)] bg-bg-card border border-border rounded-2xl shadow-2xl flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="text-2xl">{species.emoji}</div>
          <div>
            <div className="text-sm font-bold">{pet.name}</div>
            <div className="text-[10px] text-fg-muted">{species.name} · {species.voiceHint.slice(0, 16)}…</div>
          </div>
        </div>
        <button onClick={onClose} className="text-fg-muted hover:text-fg">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-fg-muted mt-12">
            跟 {pet.name} 聊聊。會記得你的學習狀態。
          </div>
        ) : null}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-accent text-black"
                  : "bg-bg-elevated"
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

      <div className="p-3 border-t border-border flex gap-2">
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
          className="flex-1 bg-bg border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className="p-2 bg-accent text-black rounded-lg disabled:opacity-30"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
