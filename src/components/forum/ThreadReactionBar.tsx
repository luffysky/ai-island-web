"use client";

import { useEffect, useState } from "react";

const EMOJIS = ["👍", "❤️", "🔥", "🎉", "🤔", "👀"];

export function ThreadReactionBar({ threadId }: { threadId: string }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<Set<string>>(new Set());
  const api = `/api/forum/threads/${threadId}/reactions`;

  useEffect(() => {
    fetch(api)
      .then((r) => r.json())
      .then((j) => {
        setCounts(j.reactions ?? {});
        setMine(new Set(j.mine ?? []));
      });
  }, [threadId]);

  const toggle = async (emoji: string) => {
    // 樂觀更新
    const had = mine.has(emoji);
    setMine((prev) => {
      const next = new Set(prev);
      had ? next.delete(emoji) : next.add(emoji);
      return next;
    });
    setCounts((c) => ({ ...c, [emoji]: Math.max(0, (c[emoji] ?? 0) + (had ? -1 : 1)) }));

    const res = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (!res.ok) {
      // 回滾
      setMine((prev) => {
        const next = new Set(prev);
        had ? next.add(emoji) : next.delete(emoji);
        return next;
      });
      setCounts((c) => ({ ...c, [emoji]: Math.max(0, (c[emoji] ?? 0) + (had ? 1 : -1)) }));
      if (res.status === 401) alert("請先登入才能反應");
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
      {EMOJIS.map((emoji) => {
        const count = counts[emoji] ?? 0;
        const active = mine.has(emoji);
        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            className={`px-2.5 py-1 rounded-full border text-sm transition flex items-center gap-1 ${
              active
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15"
                : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-accent)]"
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-xs font-bold">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
