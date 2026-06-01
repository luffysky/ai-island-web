"use client";

import { useMemo } from "react";

type Frag = { tags: string[] };

/** 標籤雲：字級隨出現次數變大、點擊可篩選 */
export function TagCloud({
  fragments,
  activeTag,
  onTagClick,
}: {
  fragments: Frag[];
  activeTag: string | null;
  onTagClick: (tag: string) => void;
}) {
  const tags = useMemo(() => {
    const count = new Map<string, number>();
    for (const f of fragments) for (const t of f.tags ?? []) count.set(t, (count.get(t) ?? 0) + 1);
    return Array.from(count.entries()).sort((a, b) => b[1] - a[1]);
  }, [fragments]);

  if (tags.length === 0) {
    return <div className="text-center text-fg-muted text-sm py-12">還沒有標籤。先幫碎片加標籤、或用「分析碎片」讓 AI 標。</div>;
  }

  const max = tags[0][1];
  const min = tags[tags.length - 1][1];
  const size = (n: number) => {
    if (max === min) return 1.1;
    return 0.85 + ((n - min) / (max - min)) * 1.6; // 0.85rem ~ 2.45rem
  };

  return (
    <div className="bg-bg-card border border-border rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 leading-relaxed">
        {tags.map(([tag, n]) => (
          <button
            key={tag}
            onClick={() => onTagClick(tag)}
            title={`${n} 個碎片`}
            style={{ fontSize: `${size(n)}rem` }}
            className={`font-bold transition hover:scale-110 ${
              activeTag === tag ? "text-accent" : "text-fg-muted hover:text-accent"
            }`}
          >
            #{tag}
            <span className="text-[0.6em] align-super text-fg-muted ml-0.5">{n}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
