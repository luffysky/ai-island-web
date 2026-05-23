"use client";

import { useEffect, useState } from "react";

const EMOJIS = ["❤️", "🔥", "👏", "😮", "😂", "🎉"];

// 簡單的瀏覽器指紋（不精準、夠用來防同人重複按）
function getFingerprint(): string {
  const key = "blog_fp";
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, fp);
  }
  return fp;
}

export function ReactionBar({
  userSlug,
  articleSlug,
}: {
  userSlug: string;
  articleSlug: string;
}) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<Set<string>>(new Set());
  const apiBase = `/api/blog/${userSlug}/${articleSlug}/reactions`;

  useEffect(() => {
    fetch(apiBase)
      .then((r) => r.json())
      .then((j) => setCounts(j.reactions ?? {}));
    // 從 localStorage 復原「我按過哪些」
    const saved = localStorage.getItem(`blog_react_${articleSlug}`);
    if (saved) setMine(new Set(JSON.parse(saved)));
  }, []);

  const toggle = async (emoji: string) => {
    const fp = getFingerprint();
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji, fingerprint: fp }),
    });
    const json = await res.json();
    if (!res.ok) return;

    // 更新數字
    setCounts((c) => ({
      ...c,
      [emoji]: Math.max(0, (c[emoji] ?? 0) + (json.active ? 1 : -1)),
    }));
    // 更新「我的」
    setMine((prev) => {
      const next = new Set(prev);
      if (json.active) next.add(emoji);
      else next.delete(emoji);
      localStorage.setItem(`blog_react_${articleSlug}`, JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <div className="flex flex-wrap gap-2 my-6">
      {EMOJIS.map((emoji) => {
        const count = counts[emoji] ?? 0;
        const active = mine.has(emoji);
        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            className={`px-3 py-1.5 rounded-full border text-sm transition flex items-center gap-1.5 ${
              active
                ? "border-accent bg-accent/15"
                : "border-border bg-bg-card hover:border-accent"
            }`}
          >
            <span className="text-base">{emoji}</span>
            {count > 0 && <span className="text-xs font-bold">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
