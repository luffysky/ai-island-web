"use client";
import Link from "next/link";
import { STAGE_COLORS, DIFFICULTY_LABELS } from "@/lib/utils";
import { motion } from "framer-motion";

interface Props {
  chapters: any[];
}

export function ChapterMap({ chapters }: Props) {
  const byStage: Record<number, any[]> = {};
  chapters.forEach(c => {
    const stageKey = c.stage === "appendix" ? 7 : Number(c.stage);
    if (!byStage[stageKey]) byStage[stageKey] = [];
    byStage[stageKey].push(c);
  });

  return (
    <div className="space-y-12">
      {[1, 2, 3, 4, 5, 6, 7].map((stage) => {
        const cfg = STAGE_COLORS[stage];
        const list = byStage[stage] ?? [];
        return (
          <div key={stage}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{cfg.emoji}</span>
              <h3 className="text-xl font-bold" style={{ color: cfg.from }}>
                Stage {stage} · {cfg.name}
              </h3>
              <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${cfg.from}, transparent)` }} />
              <span className="text-xs text-fg-muted">{list.length} 章</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {list.map((ch, idx) => (
                <motion.div
                  key={ch.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.02 }}
                >
                  <Link
                    href={`/chapters/${ch.id}`}
                    className="block p-4 rounded-lg bg-bg-card border border-border hover:border-accent transition-all hover:scale-[1.03] relative overflow-hidden group"
                  >
                    {ch.status === "coming-soon" && (
                      <div className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                        敬請期待
                      </div>
                    )}
                    <div className="text-xs text-fg-muted mb-1">Ch {String(ch.id).padStart(2, "0")}</div>
                    <div className="font-semibold mb-1 text-sm">{ch.title}</div>
                    <div className="text-xs text-fg-muted mb-3 line-clamp-1">{ch.subtitle}</div>
                    <div className="flex items-center justify-between text-[10px] text-fg-dim">
                      <span>{DIFFICULTY_LABELS[ch.difficulty]}</span>
                      <span>{ch.lessonCount} lessons</span>
                    </div>
                    {ch.boss ? (
                      <div className="mt-2 text-xs flex items-center gap-1 text-fg-muted">
                        <span>{ch.boss.emoji}</span>
                        <span className="truncate">{ch.boss.name}</span>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs flex items-center gap-1 text-fg-muted">
                        <span>📖</span>
                        <span className="truncate">速查附錄</span>
                      </div>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
