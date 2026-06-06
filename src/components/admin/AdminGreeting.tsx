"use client";

import { useEffect, useState } from "react";

/** 後台時段問候（依瀏覽者本地時間）+ 今日註冊數 + 雪鑰揮手。 */
export function AdminGreeting({ name, signupsToday }: { name: string; signupsToday: number }) {
  const [g, setG] = useState<{ text: string; emoji: string }>({ text: "你好", emoji: "👋" });
  useEffect(() => {
    const h = new Date().getHours();
    if (h < 5) setG({ text: "夜深了", emoji: "🌙" });
    else if (h < 11) setG({ text: "早安", emoji: "☀️" });
    else if (h < 14) setG({ text: "午安", emoji: "🍱" });
    else if (h < 18) setG({ text: "午後好", emoji: "☕" });
    else if (h < 23) setG({ text: "晚安", emoji: "🌆" });
    else setG({ text: "夜深了", emoji: "🌙" });
  }, []);

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-gradient-to-r from-accent/12 via-accent-2/[0.06] to-transparent px-4 py-3">
      <span className="text-2xl inline-block" style={{ animation: "admin-wave 1.6s ease-in-out 2", transformOrigin: "70% 80%" }}>{g.emoji}</span>
      <div className="min-w-0">
        <div className="font-bold truncate">{g.text}，{name}！</div>
        <div className="text-xs text-fg-muted">
          今天 <b className="text-accent">{signupsToday}</b> 人加入 AI 島{signupsToday > 0 ? " 🎉 雪鑰陪你顧家" : "、衝一波 💪"}
        </div>
      </div>
    </div>
  );
}
