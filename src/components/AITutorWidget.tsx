"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Send, X, ChevronDown, Settings as SettingsIcon, Plus, Loader2, History, MessageSquare, ImagePlus, Trash2 } from "lucide-react";
import { useOverlayCount, useOverlayRegister } from "@/lib/overlay-stack";
import { chapterDisplayNumberById } from "@/lib/chapter-display";
import { useEdgeSafe } from "@/lib/use-edge-safe";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { devLog } from "@/lib/dev-log";

const TUTOR_POS_KEY = "ai_tutor_ball_pos";
const DRAG_THRESHOLD_PX = 5;

function DraggableTutorBall({ onOpen }: { onOpen: () => void }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLButtonElement | null>(null);
  const dragRef = useRef<{ sx: number; sy: number; ex: number; ey: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(TUTOR_POS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.x === "number" && typeof p.y === "number") {
          setPos(clamp(p));
          return;
        }
      }
    } catch {}
    setPos({ x: window.innerWidth - 88, y: window.innerHeight - 88 });
  }, []);

  useEffect(() => {
    const onResize = () => setPos((p) => p ? clamp(p) : p);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const clamp = (p: { x: number; y: number }) => {
    if (typeof window === "undefined") return p;
    const W = window.innerWidth, H = window.innerHeight;
    return { x: Math.max(8, Math.min(W - 72, p.x)), y: Math.max(8, Math.min(H - 72, p.y)) };
  };

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!ref.current || !pos) return;
    e.preventDefault();
    ref.current.setPointerCapture(e.pointerId);
    dragRef.current = { sx: e.clientX, sy: e.clientY, ex: pos.x, ey: pos.y, moved: false };
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    d.moved = true;
    setDragging(true);
    setPos(clamp({ x: d.ex + dx, y: d.ey + dy }));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    if (ref.current?.hasPointerCapture(e.pointerId)) ref.current.releasePointerCapture(e.pointerId);
    if (d.moved) {
      const final = clamp({ x: d.ex + (e.clientX - d.sx), y: d.ey + (e.clientY - d.sy) });
      setPos(final);
      try { localStorage.setItem(TUTOR_POS_KEY, JSON.stringify(final)); } catch {}
    } else {
      // 純點擊
      onOpen();
    }
    setDragging(false);
    dragRef.current = null;
  }, [onOpen]);

  // modal 開時隱藏（避免擋 dropdown / TODO panel）
  const overlayCount = useOverlayCount();
  if (!pos || overlayCount > 0) return null;

  return (
    <button
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { dragRef.current = null; setDragging(false); }}
      style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 30, touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
      className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 via-emerald-400 to-cyan-400 text-black shadow-2xl hover:scale-110 transition flex items-center justify-center group select-none"
      title="綠寶 — 你的 AI 學習導師（可拖曳）"
      aria-label="開啟 AI 導師"
    >
      <span className="text-2xl group-hover:scale-110 transition" aria-hidden>✨</span>
      <span className="absolute -bottom-1 right-0 text-[8px] bg-black text-white px-1.5 py-0.5 rounded-full whitespace-nowrap pointer-events-none">
        綠寶 🐹
      </span>
    </button>
  );
}

import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import { PERSONA_LIST, getPersona, type PersonaId } from "@/lib/ai-personas";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { linkifyChapterRefs } from "@/lib/linkify-chapters";
import { CodeBlock } from "@/components/chapter/CodeBlock";
import { CopyButton, TypingIndicator, ChatToolbar, formatChatTime } from "@/components/chat";

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
  images?: Array<{ previewUrl: string; mediaType: string }>;
  created_at?: string;
}

export function AITutorWidget({
  contextChapterId,
  contextLessonId,
}: {
  contextChapterId?: number;
  contextLessonId?: string;
}) {
  const [open, setOpen] = useState(false);
  useOverlayRegister(open);
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [tone, setTone] = useState("friendly");
  const [personaId, setPersonaId] = useState<PersonaId>("green");
  const persona = getPersona(personaId);
  const [useBYOK, setUseBYOK] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  // 上傳的圖片（截圖 / 相簿 / 拍照）— 跟 user message 一起送
  const [images, setImages] = useState<Array<{ id: string; base64: string; mediaType: string; previewUrl: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [quotaUsed, setQuotaUsed] = useState<{ used: number; limit: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; title: string; updated_at: string }>>([]);
  const [deletingHistIds, setDeletingHistIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const confirm = useConfirm();
  // 用全站 AuthContext、不再自己 race
  const { status: authState } = useAuth();
  const isLoggedIn = authState === "in";
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useEdgeSafe(panelRef);
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
        devLog.error("[AI tutor] load models failed:", modelsError);
        setError("AI 模型清單載入失敗");
        return;
      }
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
        devLog.error("[AI tutor] load quota failed:", quotaError);
      }
      const def = models.find((m: any) => m.is_default);
      setQuotaUsed({ used: q?.free_used ?? 0, limit: def?.free_tier_daily_limit ?? 10 });
    })();
  }, [authState, models]);

  // 自動 scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, 5 - images.length);
    const newImages: typeof images = [];
    for (const file of list) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 10 * 1024 * 1024) {
        setError(`圖片 ${file.name} 超過 10MB、跳過`);
        continue;
      }
      try {
        const { base64, mediaType } = await compressImage(file);
        newImages.push({
          id: crypto.randomUUID(),
          base64: base64.split(",")[1] ?? base64,
          mediaType,
          previewUrl: base64,
        });
      } catch (err) {
        devLog.error("[AI tutor] compress image failed:", err);
      }
    }
    setImages((prev) => [...prev, ...newImages].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (id: string) => setImages((prev) => prev.filter((i) => i.id !== id));

  // 貼上（Ctrl/Cmd + V）— 桌面版方便
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      handleFiles(dt.files);
    }
  };

  const send = async () => {
    if ((!input.trim() && images.length === 0) || sending) return;
    if (!isLoggedIn) {
      setError("請先登入才能使用 AI 導師");
      return;
    }
    if (!selectedModelId) {
      setError("目前沒有可用 AI 模型，請稍後再試");
      return;
    }

    const userMsg = input.trim() || (images.length > 0 ? "（看圖回答）" : "");
    const sendImages = images.map((img) => ({ base64: img.base64, mediaType: img.mediaType }));
    const userImagesPreview = images.map((img) => ({ previewUrl: img.previewUrl, mediaType: img.mediaType }));
    setInput("");
    setImages([]);
    setError("");
    const now = new Date().toISOString();
    setMessages((prev) => [...prev,
      { role: "user", content: userMsg, images: userImagesPreview.length > 0 ? userImagesPreview : undefined, created_at: now },
      { role: "assistant", content: "", created_at: now },
    ]);
    setSending(true);

    try {
      // 島嶼每日學習任務（client-only）
      import("@/components/island/island-bus").then((m) => m.bumpQuest("ai_chat", 1)).catch(() => {});
      const res = await fetch("/api/ai/chat", {
      credentials: "include",
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
          images: sendImages,
        }),
      });

      // 非 200 = error response（多半是 JSON、但邊緣 502/504/413 可能回空 body 或 HTML）
      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        let parsed: any = null;
        if (raw) {
          try { parsed = JSON.parse(raw); } catch {}
        }
        const fallback = res.status === 413
          ? "上傳內容太大、請減少圖片數量或縮小圖片"
          : res.status === 504 || res.status === 502
          ? "伺服器忙線中（gateway timeout）、稍後再試"
          : res.status === 401
          ? "登入逾時、請重新整理"
          : `伺服器錯誤 (HTTP ${res.status})`;
        const msg = parsed?.message || parsed?.error || (raw && raw.length < 200 ? raw : "") || fallback;
        setError(msg);
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: `❌ ${msg}` };
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
      credentials: "include",
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

  const deleteHistory = async (
    h: { id: string; title: string },
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    const ok = await confirm({
      title: "刪除這段對話？",
      description: `「${h.title || "(無標題)"}」連同所有訊息會永久消失、無法復原。`,
      confirmLabel: "刪除",
      destructive: true,
    });
    if (!ok) return;

    setDeletingHistIds((s) => new Set(s).add(h.id));
    const snapshot = history;
    setHistory((cs) => cs.filter((c) => c.id !== h.id));
    // 正在看的對話被刪 → 自動 newChat
    if (conversationId === h.id) newChat();

    try {
      const res = await fetch(`/api/me/ai-history/${h.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      setHistory(snapshot);  // rollback
      setError("刪除失敗、請再試一次");
    } finally {
      setDeletingHistIds((s) => {
        const next = new Set(s);
        next.delete(h.id);
        return next;
      });
    }
  };

  const selectedModel = models.find((m) => m.id === selectedModelId);

  return (
    <>
      {/* Floating button - 綠寶導師（可拖曳） */}
      {!open && <DraggableTutorBall onOpen={() => setOpen(true)} />}

      {/* Chat panel */}
      {open && (
        <div
          ref={panelRef}
          style={{
            // clamp(最小, 動態, 最大)
            //   - 最小 280px：panel 太窄塞不下內容、體驗更差
            //   - 動態 calc(100vw - 1rem)：跟視口跑、所有裝置都不超出
            //   - 最大 480px：桌面太大也不該佔半個螢幕
            // useEdgeSafe hook 是第二層保險：ResizeObserver 即時偵測異常溢出再 translate 回視口
            width: "clamp(280px, calc(100vw - 1rem), 480px)",
            height: "clamp(420px, calc(100vh - 5rem), 700px)",
          }}
          className="fixed bottom-2 right-2 z-50 bg-bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-tutor-panel-in"
        >
          <style jsx global>{`
            @keyframes tutor-panel-in {
              from { opacity: 0; transform: translateY(16px) scale(0.96); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            .animate-tutor-panel-in {
              animation: tutor-panel-in 0.32s cubic-bezier(0.22, 1, 0.36, 1);
            }
          `}</style>
          {/* Header — 漸層條 + 跳動 avatar */}
          <div className="relative flex items-center justify-between p-3 border-b border-border bg-gradient-to-r from-green-400/10 via-emerald-400/10 to-cyan-400/10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-cyan-400 blur-md opacity-50 animate-pulse" />
                <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-green-400 via-emerald-400 to-cyan-400 ring-1 ring-emerald-300/50 flex items-center justify-center text-base">
                  ✨
                </div>
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm flex items-center gap-1">
                  {persona.emoji} {persona.name}
                  {contextChapterId && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-900 dark:text-blue-200 rounded-full ml-1">
                      📚 Ch{chapterDisplayNumberById(Number(contextChapterId))}
                    </span>
                  )}
                </div>
                {selectedModel && (
                  <div className="text-xs text-fg-muted truncate">{selectedModel.display_name}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
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
                  <div
                    key={h.id}
                    role="button"
                    tabIndex={0}
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
                    className="group flex items-center gap-2 p-2 hover:bg-bg-elevated text-sm border-t border-border cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate flex items-center gap-1">
                        <MessageSquare size={12} className="text-fg-muted shrink-0" />
                        <span className="truncate">{h.title || "(無標題)"}</span>
                      </div>
                      <div className="text-xs text-fg-muted mt-0.5">
                        {new Date(h.updated_at).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => deleteHistory(h, e)}
                      disabled={deletingHistIds.has(h.id)}
                      aria-label="刪除對話"
                      title="刪除對話"
                      className="p-1.5 rounded text-fg-muted hover:text-red-400 hover:bg-red-500/10 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {deletingHistIds.has(h.id) ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </div>
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

          {/* 搜尋 + export toolbar — 訊息 >3 才顯示 */}
          {messages.length > 3 && (
            <ChatToolbar
              onSearch={setSearch}
              exportText={messages.filter((m) => m.content).map((m) => `[${m.role === "user" ? "你" : persona.name}] ${m.content}`).join("\n\n")}
              exportFileName={`ai-tutor-${new Date().toISOString().slice(0, 10)}.txt`}
              placeholder="搜尋這段對話..."
            />
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
            {messages
              .map((m, i) => ({ ...m, _i: i }))
              .filter((m) => !search || m.content.toLowerCase().includes(search.toLowerCase()))
              .map((m) => (
              <div key={m._i} className={`group/msg flex flex-col gap-0.5 ${m.role === "user" ? "items-end" : "items-start"}`}>
                {m.created_at && (
                  <div className={`flex items-center gap-2 text-[10px] text-fg-muted px-1 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    <span className="font-bold">{m.role === "user" ? "你" : `${persona.emoji} ${persona.name}`}</span>
                    <time title={new Date(m.created_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })} className="tabular-nums">
                      {formatChatTime(m.created_at)}
                    </time>
                    {m.content && (
                      <span className="md:opacity-0 md:group-hover/msg:opacity-100 transition">
                        <CopyButton text={m.content} size={10} />
                      </span>
                    )}
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm transition-all hover:shadow-md animate-chat-bubble-in ${
                  m.role === "user"
                    ? "bg-gradient-to-br from-accent to-accent-2 text-black shadow-accent/20"
                    : "bg-gradient-to-br from-bg-elevated to-bg-card border border-border/50 text-fg backdrop-blur-sm"
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
                    <>
                      {m.images && m.images.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                          {m.images.map((img, j) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={j}
                              src={img.previewUrl}
                              alt=""
                              className="w-24 h-24 object-cover rounded-lg border border-black/20"
                            />
                          ))}
                        </div>
                      )}
                      {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                    </>
                  )}
                </div>
              </div>
            ))}
            {sending && messages[messages.length - 1]?.role === "assistant" && !messages[messages.length - 1]?.content && (
              <div className="flex justify-start">
                <div className="bg-bg-elevated rounded-2xl px-3 py-2">
                  <TypingIndicator label={`${persona.name} 正在輸入`} />
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

          {/* Image preview */}
          {images.length > 0 && (
            <div className="px-3 pt-2 flex flex-wrap gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative group">
                  <img src={img.previewUrl} alt="" className="w-16 h-16 object-cover rounded-md border border-border" />
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                    title="移除"
                  >×</button>
                </div>
              ))}
              <div className="text-[10px] text-fg-muted w-full">{images.length}/5 張</div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex gap-2 items-end">
              {/* 圖片上傳按鈕（手機點開會跳「相簿/拍照/檔案」選單）*/}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={authState !== "in" || sending || images.length >= 5}
                className="p-2 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition disabled:opacity-30"
                title={images.length >= 5 ? "最多 5 張" : "上傳截圖 / 相簿 / 拍照（也可 Ctrl+V 貼上）"}
              >
                <ImagePlus size={16} />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={
                  authState === "loading"
                    ? "載入中..."
                    : authState !== "in"
                    ? "請先登入"
                    : images.length > 0
                    ? "問圖片相關問題..."
                    : "問點什麼（可 Ctrl+V 貼截圖）..."
                }
                disabled={authState !== "in" || sending}
                rows={1}
                className="flex-1 bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent resize-none"
                style={{ maxHeight: "120px" }}
              />
              <button
                onClick={send}
                disabled={(!input.trim() && images.length === 0) || sending || authState !== "in"}
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 把圖片縮到寬度 max 1280px、JPEG 0.82 — 控制單張在 ~500KB 內，避免 request body 超過 server 限制（Zeabur/Vercel 都會 413）
async function compressImage(file: File): Promise<{ base64: string; mediaType: string }> {
  const MAX_W = 1280;
  const QUALITY = 0.82;
  const dataUrl = await fileToBase64(file);
  // GIF / SVG 等不壓、直接回原檔
  if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
    return { base64: dataUrl, mediaType: file.type };
  }
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = dataUrl;
    });
    const scale = img.width > MAX_W ? MAX_W / img.width : 1;
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { base64: dataUrl, mediaType: file.type };
    ctx.drawImage(img, 0, 0, w, h);
    const out = canvas.toDataURL("image/jpeg", QUALITY);
    return { base64: out, mediaType: "image/jpeg" };
  } catch {
    return { base64: dataUrl, mediaType: file.type };
  }
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
