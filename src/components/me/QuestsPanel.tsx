"use client";

import { useEffect, useState } from "react";
import { Trophy, Check, Coins, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Quest = {
  id: string;
  quest_type: string;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  reward_xp: number;
  reward_z: number;
};

const TYPE_META: Record<string, { label: string; icon: string }> = {
  complete_lessons: { label: "完成 lesson", icon: "📚" },
  daily_checkin: { label: "每日簽到", icon: "📅" },
  ai_chat: { label: "用 AI 對話", icon: "🤖" },
  forum_post: { label: "論壇發文", icon: "🗣️" },
  blog_write: { label: "寫部落格", icon: "📝" },
  daily_quiz: { label: "每日測驗", icon: "🧠" },
  bookmark: { label: "收藏 lesson", icon: "⭐" },
};

export function QuestsPanel() {
  const toast = useToast();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/quests");
      const j = await res.json();
      if (res.ok) setQuests(j.quests ?? []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const claim = async (questId: string) => {
    setClaiming(questId);
    try {
      const res = await fetch("/api/quests/claim", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "失敗");
      toast.success(`+${j.reward_xp} XP · +${j.reward_z} 🪙`);
      setQuests((qs) => qs.map((q) => q.id === questId ? { ...q, claimed: true } : q));
    } catch (e: any) {
      toast.error(`領取失敗：${e?.message || ""}`);
    } finally {
      setClaiming(null);
    }
  };

  const totalReward = quests
    .filter((q) => q.completed && !q.claimed)
    .reduce((s, q) => ({ xp: s.xp + q.reward_xp, z: s.z + q.reward_z }), { xp: 0, z: 0 });

  return (
    <section className="rounded-xl bg-bg-card border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold flex items-center gap-2">
          <Trophy size={18} className="text-accent" /> 今日任務
        </h2>
        {(totalReward.xp > 0 || totalReward.z > 0) && (
          <span className="text-xs text-fg-muted">
            可領 +{totalReward.xp} XP · +{totalReward.z} 🪙
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-6 text-fg-muted text-sm">
          <Loader2 size={16} className="inline animate-spin mr-1" /> 載入中
        </div>
      ) : quests.length === 0 ? (
        <div className="text-center py-6 text-fg-muted text-sm">今天還沒有任務</div>
      ) : (
        <ul className="space-y-2">
          {quests.map((q) => {
            const meta = TYPE_META[q.quest_type] ?? { label: q.quest_type, icon: "✨" };
            const pct = q.target > 0 ? Math.min(100, Math.round((q.progress / q.target) * 100)) : 0;
            return (
              <li key={q.id} className="flex items-center gap-3 p-2 rounded-lg bg-bg">
                <span className="text-2xl shrink-0">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{meta.label} ({q.progress}/{q.target})</span>
                    <span className="text-xs text-fg-muted">+{q.reward_xp} XP · +{q.reward_z} 🪙</span>
                  </div>
                  <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full transition-all ${q.completed ? "bg-emerald-500" : "bg-accent"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                {q.claimed ? (
                  <span className="text-xs text-fg-muted px-2 py-1 flex items-center gap-0.5 shrink-0">
                    <Check size={12} className="text-emerald-400" /> 已領
                  </span>
                ) : q.completed ? (
                  <button
                    onClick={() => claim(q.id)}
                    disabled={claiming === q.id}
                    className="text-xs px-3 py-1.5 rounded-lg bg-accent text-black font-bold shrink-0 disabled:opacity-50 active:scale-95 transition"
                  >
                    {claiming === q.id ? "領取中…" : "🎁 領取"}
                  </button>
                ) : (
                  <span className="text-[10px] text-fg-muted px-2 py-1 shrink-0">{pct}%</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
