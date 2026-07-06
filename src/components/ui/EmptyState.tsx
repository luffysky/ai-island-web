import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { EmptyStateVisual } from "./EmptyStateVisual";

/**
 * 統一 Empty state 元件（沒資料時用）
 *   <EmptyState icon={NotebookPen} title="還沒有筆記" desc="去章節隨手記點什麼"
 *               action={{ label: "去看章節", href: "/chapters" }} />
 *
 * 優先用 lucide icon；emoji 仍保留向後相容（吉祥物 🐹 / 🐍 等沒有合適 icon 的才用）。
 * 若同時給 icon 與 emoji、優先用 icon。
 */
export function EmptyState({
  icon: Icon,
  emoji,
  title,
  desc,
  action,
  compact = false,
}: {
  icon?: LucideIcon;
  emoji?: string;
  title: string;
  desc?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  compact?: boolean;
}) {
  // 原本的視覺節點（lucide icon 或 emoji）— 當 empty_state Lottie 沒設 / 載不出來時的 fallback。
  // 放進柔和的 accent 圓形徽章 + 輕輕浮動，比裸 icon 更有溫度。
  const fallbackVisual = Icon ? (
    <span className={`soft-bob inline-flex items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20 text-accent ${compact ? "w-14 h-14" : "w-20 h-20"}`}>
      <Icon className={compact ? "w-7 h-7" : "w-10 h-10"} strokeWidth={1.5} />
    </span>
  ) : (
    <span className={`soft-bob inline-flex items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20 ${compact ? "w-14 h-14 text-2xl" : "w-20 h-20 text-4xl"}`}>{emoji ?? "📦"}</span>
  );

  return (
    <div className={`reveal text-center ${compact ? "py-6" : "py-16"} text-fg-muted`}>
      <EmptyStateVisual fallback={fallbackVisual} compact={compact} />
      <div className={compact ? "text-sm font-medium text-fg" : "text-base font-bold text-fg"}>{title}</div>
      {desc && <div className="text-xs mt-1 max-w-xs mx-auto leading-relaxed">{desc}</div>}
      {action && (
        action.href ? (
          <Link
            href={action.href as any}
            className="inline-block mt-4 px-4 py-2 rounded-full bg-accent text-black font-bold text-sm hover:scale-105 transition"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-block mt-4 px-4 py-2 rounded-full bg-accent text-black font-bold text-sm hover:scale-105 transition"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
