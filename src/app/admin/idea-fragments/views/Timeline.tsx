"use client";

import { useMemo } from "react";

type Frag = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  mood: string | null;
  tags: string[];
  created_at: string;
};

/** 時間軸：依建立日期由新到舊分組 */
export function Timeline({ fragments, onSelect }: { fragments: Frag[]; onSelect: (id: string) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, Frag[]>();
    for (const f of [...fragments].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))) {
      const day = new Date(f.created_at).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" });
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(f);
    }
    return Array.from(map.entries());
  }, [fragments]);

  if (fragments.length === 0) {
    return <div className="text-center text-fg-muted text-sm py-12">還沒有碎片。</div>;
  }

  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5">
      <div className="relative pl-6">
        {/* 軸線 */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
        {groups.map(([day, frags]) => (
          <div key={day} className="mb-6 last:mb-0">
            <div className="relative mb-2">
              <span className="absolute -left-[22px] top-1 w-3.5 h-3.5 rounded-full bg-accent ring-4 ring-bg-card" />
              <div className="text-sm font-bold text-accent">{day}</div>
              <div className="text-[11px] text-fg-muted">{frags.length} 個碎片</div>
            </div>
            <div className="space-y-1.5">
              {frags.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onSelect(f.id)}
                  className="block w-full text-left bg-bg-elevated hover:bg-accent/10 border border-border hover:border-accent/40 rounded-lg px-3 py-2 transition"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">{f.title}</span>
                    {f.category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-700 dark:text-violet-300">{f.category}</span>}
                    {f.mood && <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-700 dark:text-pink-300">{f.mood}</span>}
                    <span className="text-[10px] text-fg-muted ml-auto">
                      {new Date(f.created_at).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {f.content && <div className="text-xs text-fg-muted mt-0.5 line-clamp-1">{f.content}</div>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
