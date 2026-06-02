"use client";

import { useMemo } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";
import { chaptersLite } from "@/data/chapters-lite";

/**
 * 個人技能雷達圖。
 * 6 個維度依 stage 對應：
 *   前端基礎（stage 1） / 互動前端（2） / 後端 + DB（3）
 *   多語言（4） / 商業 + 管理（5） / AI 應用（6）
 *
 * 用「該 stage 完成 lessons / 該 stage 總 lessons」算 %。
 */

const STAGE_LABELS: Record<string, string> = {
  "1": "🌱 前端基礎",
  "2": "🚀 互動前端",
  "3": "🔮 後端 + DB",
  "4": "🌍 多語言",
  "5": "💼 商業",
  "6": "🤖 AI 應用",
};

export function SkillRadar({ completedSet }: { completedSet: Set<string> }) {
  const data = useMemo(() => {
    const buckets: Record<string, { done: number; total: number }> = {};
    for (const stage of Object.keys(STAGE_LABELS)) buckets[stage] = { done: 0, total: 0 };

    for (const c of chaptersLite) {
      const s = String(c.stage);
      if (!buckets[s]) continue; // 略過 stage 7 / appendix
      for (const lid of c.lessonIds) {
        buckets[s].total++;
        if (completedSet.has(lid)) buckets[s].done++;
      }
    }

    return Object.entries(STAGE_LABELS).map(([stage, label]) => {
      const b = buckets[stage] ?? { done: 0, total: 1 };
      const pct = b.total > 0 ? Math.round((b.done / b.total) * 100) : 0;
      return { subject: label, A: pct, fullMark: 100 };
    });
  }, [completedSet]);

  return (
    <section className="rounded-xl bg-bg-card border border-border p-4">
      <h2 className="font-bold mb-3 flex items-center gap-2">📡 技能雷達</h2>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.15)" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "currentColor" }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
          <Radar
            name="解鎖度"
            dataKey="A"
            stroke="var(--color-accent)"
            fill="var(--color-accent)"
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-fg-muted text-center mt-2">
        每軸代表該 stage 的 lesson 完成度（0-100%）
      </p>
    </section>
  );
}
