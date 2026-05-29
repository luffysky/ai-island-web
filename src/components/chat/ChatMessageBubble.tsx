"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { formatChatTime } from "@/lib/chat-time";
import { useToast } from "@/components/ui/Toast";

/**
 * 共用 fade-slide 進場動畫
 * 訊息進來時往上滑 4px + 淡入、不讓 UI 突然蹦出來
 */
const BUBBLE_ENTER = "animate-chat-bubble-in";

/**
 * AI 對話訊息泡泡（統一樣式）
 * 林董要求：
 *   1. 時間戳（hover 顯示完整、預設顯示「15:03」）
 *   2. 複製按鈕（hover 出現在右上角）
 *   3. 分享按鈕（user agent 支援 Web Share API 時顯示）
 *   4. code block 自動加複製按鈕（透過 renderContent prop 傳給 caller）
 */
export function ChatMessageBubble({
  role,
  content,
  createdAt,
  showActions = true,
  speakerName,
  children,
}: {
  role: "user" | "assistant" | "pet" | string;
  content: string;
  createdAt?: string | Date | number;
  showActions?: boolean;
  speakerName?: string;
  children?: React.ReactNode; // 自訂渲染（例如 markdown / code block）；不傳就用純文字
}) {
  const toast = useToast();
  const [showHoverActions, setShowHoverActions] = useState(false);
  const isUser = role === "user";

  const share = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ text: content });
        return;
      } catch {
        // 用戶取消、忽略
      }
    }
    // fallback 複製
    try {
      await navigator.clipboard.writeText(content);
      toast.success("已複製、可以貼到任何地方分享");
    } catch {
      toast.error("分享失敗");
    }
  };

  return (
    <div
      className={`group flex ${isUser ? "justify-end" : "justify-start"} relative ${BUBBLE_ENTER}`}
      onMouseEnter={() => setShowHoverActions(true)}
      onMouseLeave={() => setShowHoverActions(false)}
    >
      <div className="max-w-[85%] flex flex-col gap-0.5">
        {/* meta：發送者 + 時間戳 */}
        {(speakerName || createdAt) && (
          <div className={`flex items-center gap-2 text-[10px] text-fg-muted px-1 ${isUser ? "justify-end" : "justify-start"}`}>
            {!isUser && speakerName && <span className="font-bold bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">{speakerName}</span>}
            {createdAt && (
              <time
                title={typeof createdAt === "string" || createdAt instanceof Date ? new Date(createdAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) : ""}
                className="tabular-nums opacity-75 group-hover:opacity-100 transition"
              >
                {formatChatTime(createdAt)}
              </time>
            )}
            {isUser && speakerName && <span className="font-bold">{speakerName}</span>}
          </div>
        )}

        {/* bubble — 漸層 + 軟陰影 */}
        <div
          className={`relative rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words shadow-sm transition-all hover:shadow-md ${
            isUser
              ? "bg-gradient-to-br from-accent to-accent-2 text-black shadow-accent/20"
              : "bg-gradient-to-br from-bg-elevated to-bg-card border border-border/50 backdrop-blur-sm"
          }`}
        >
          {children ?? content}

          {/* hover actions（複製 + 分享）*/}
          {showActions && content && (
            <div
              className={`absolute -top-2 ${isUser ? "left-2" : "right-2"} flex items-center gap-1 transition ${
                showHoverActions ? "opacity-100" : "opacity-0 pointer-events-none"
              } md:opacity-0 md:group-hover:opacity-100`}
            >
              <div className="bg-bg border border-border rounded-full px-2 py-1 flex items-center gap-2 shadow-sm">
                <CopyButton text={content} size={11} />
                <button
                  type="button"
                  onClick={share}
                  aria-label="分享"
                  className="inline-flex items-center text-xs text-fg-muted hover:text-accent transition"
                  title="分享這則訊息"
                >
                  <Share2 size={11} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes chat-bubble-in {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-chat-bubble-in {
          animation: chat-bubble-in 0.28s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>
    </div>
  );
}
