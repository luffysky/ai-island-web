import Link from "next/link";

/**
 * 統一 Empty state 元件（沒資料時用）
 *   <EmptyState emoji="📝" title="還沒有筆記" desc="去章節隨手記點什麼"
 *               action={{ label: "去看章節", href: "/chapters" }} />
 */
export function EmptyState({
  emoji = "📦",
  title,
  desc,
  action,
  compact = false,
}: {
  emoji?: string;
  title: string;
  desc?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  compact?: boolean;
}) {
  return (
    <div className={`text-center ${compact ? "py-6" : "py-16"} text-fg-muted`}>
      <div className={compact ? "text-3xl mb-1" : "text-5xl mb-3"}>{emoji}</div>
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
