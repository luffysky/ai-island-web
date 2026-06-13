"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Send } from "lucide-react";
import { getSpecies, type SpeciesId } from "@/lib/pet-species";
import { useAuth } from "@/lib/auth-context";
import { getVipTier, pickHonorific } from "@/lib/pet-vip";
import { pickChatter, type ChatterCtx } from "@/lib/pet-chatter";
import { useEdgeSafe } from "@/lib/use-edge-safe";
import { ChatMessageBubble, TypingIndicator, ChatToolbar, ChatContent, MicButton } from "@/components/chat";

type Message = { role: "user" | "pet"; content: string; created_at?: string };

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
  const [search, setSearch] = useState("");
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
        const now = new Date().toISOString();
        setMessages((m) => [
          ...m,
          { role: "user", content: userMsg, created_at: now },
          { role: "pet", content: reply, created_at: now },
        ]);
        onMessageSent?.(reply);
        return;
      }
    }

    const now = new Date().toISOString();
    setMessages((m) => [...m, { role: "user", content: userMsg, created_at: now }, { role: "pet", content: "", created_at: now }]);
    setSending(true);

    try {
      const res = await fetch("/api/pet/chat", {
      credentials: "include",
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
                const prev = copy[copy.length - 1];
                copy[copy.length - 1] = { role: "pet", content: accumulated, created_at: prev?.created_at };
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
    <div
      ref={panelRef}
      style={{
        width: "clamp(280px, calc(100vw - 1rem), 440px)",
        // dvh（動態視口）：手機鍵盤彈出 / 網址列收合時跟著縮、卡片不被頂出畫面（vh 會用最大高度算、手機卡卡）
        height: "clamp(360px, calc(100dvh - 5rem), 560px)",
      }}
      className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 bg-bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-chat-panel-in"
    >
      {/* header — 漸層條 + 跳動 avatar */}
      <div className="relative flex items-center justify-between p-3 border-b border-border bg-gradient-to-r from-accent/10 via-accent-2/10 to-transparent">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent to-accent-2 blur-md opacity-50 animate-pulse-soft" />
            <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-accent/20 to-accent-2/20 ring-1 ring-accent/40 flex items-center justify-center text-xl">
              {species.emoji}
            </div>
          </div>
          <div>
            <div className="text-sm font-bold flex items-center gap-1.5">
              {pet.name}
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" title="在線" />
            </div>
            <div className="text-[10px] text-fg-muted">{species.name} · {species.voiceHint.slice(0, 16)}…</div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full text-fg-muted hover:text-fg hover:bg-bg-elevated transition">
          <X size={16} />
        </button>
      </div>
      <style jsx global>{`
        @keyframes chat-panel-in {
          from { opacity: 0; transform: translate(-50%, 16px) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        .animate-chat-panel-in {
          animation: chat-panel-in 0.32s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>

      {messages.length > 3 && (
        <ChatToolbar
          onSearch={setSearch}
          exportText={messages.filter((m) => m.content).map((m) => `[${m.role === "user" ? "你" : pet.name}] ${m.content}`).join("\n\n")}
          exportFileName={`${pet.name}-chat-${new Date().toISOString().slice(0, 10)}.txt`}
          placeholder={`搜尋跟 ${pet.name} 的對話...`}
        />
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-fg-muted mt-12">
            跟 {pet.name} 聊聊。會記得你的學習狀態。
          </div>
        ) : null}
        {messages
          .map((m, i) => ({ ...m, _i: i }))
          .filter((m) => !search || m.content.toLowerCase().includes(search.toLowerCase()))
          .map((m) => (
            <ChatMessageBubble
              key={m._i}
              role={m.role === "pet" ? "assistant" : "user"}
              content={m.content}
              createdAt={m.created_at}
              speakerName={m.role === "pet" ? pet.name : undefined}
              shareCard={
                m.role === "pet"
                  ? {
                      persona: pet.name,
                      question: messages[m._i - 1]?.role === "user" ? messages[m._i - 1]?.content : undefined,
                    }
                  : undefined
              }
            >
              {m.content ? (
                <ChatContent text={m.content} />
              ) : sending && m._i === messages.length - 1 ? (
                <TypingIndicator label={`${pet.name} 正在輸入`} />
              ) : null}
            </ChatMessageBubble>
          ))}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="px-3 py-1.5 text-xs text-red-400 bg-red-500/10 border-t border-red-500/30">
          {error}
        </div>
      )}

      <div className="p-3 border-t border-border flex gap-2 items-center">
        <MicButton
          onResult={(t) => setInput((prev) => (prev ? prev + " " : "") + t)}
          onError={(m) => setError(m)}
          disabled={sending}
          className="p-2 border border-border rounded-lg hover:border-accent hover:bg-accent/5"
        />
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
