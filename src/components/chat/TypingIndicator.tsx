"use client";

/**
 * 「對方正在輸入...」三點動畫
 * 林董：AI 思考時要顯示「綠寶正在輸入...」
 */
export function TypingIndicator({ label = "正在輸入" }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs text-fg-muted">
      <span className="inline-flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-fg-muted animate-typing-dot" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-fg-muted animate-typing-dot" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-fg-muted animate-typing-dot" style={{ animationDelay: "300ms" }} />
      </span>
      <span>{label}</span>
      <style jsx global>{`
        @keyframes typing-dot {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
        .animate-typing-dot {
          animation: typing-dot 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
