"use client";

/**
 * 「對方正在輸入...」漸層動畫
 * 林董：AI 思考時要顯示「綠寶正在輸入...」+ 美化
 */
export function TypingIndicator({ label = "正在輸入" }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs">
      <span className="inline-flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-accent to-accent-2 animate-typing-dot shadow-sm shadow-accent/40" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-accent to-accent-2 animate-typing-dot shadow-sm shadow-accent/40" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-accent to-accent-2 animate-typing-dot shadow-sm shadow-accent/40" style={{ animationDelay: "300ms" }} />
      </span>
      <span className="text-fg-muted italic animate-pulse-soft">{label}…</span>
      <style jsx global>{`
        @keyframes typing-dot {
          0%, 60%, 100% { opacity: 0.4; transform: translateY(0) scale(0.85); }
          30% { opacity: 1; transform: translateY(-4px) scale(1.1); }
        }
        .animate-typing-dot {
          animation: typing-dot 1.2s ease-in-out infinite;
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 0.65; }
          50% { opacity: 1; }
        }
        .animate-pulse-soft {
          animation: pulse-soft 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
