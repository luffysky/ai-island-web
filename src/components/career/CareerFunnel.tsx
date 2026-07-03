"use client";

import Link from "next/link";
import {
  BookOpen,
  Palette,
  Mic,
  Award,
  FileText,
  CheckCircle2,
  Circle,
  ArrowRight,
  Target,
  Sparkles,
} from "lucide-react";
import { SkillRadar } from "@/components/me/SkillRadar";
import { useMemo } from "react";

export interface FunnelStage {
  key: string;
  icon: "bookOpen" | "palette" | "mic" | "award" | "fileText";
  title: string;
  subtitle: string;
  detail: string;
  href: string;
  cta: string;
  done: boolean;
  progress: number; // 0-100 該關卡達成度
  emptyHint?: string; // 尚未開始時的一句話引導
}

const ICONS = {
  bookOpen: BookOpen,
  palette: Palette,
  mic: Mic,
  award: Award,
  fileText: FileText,
} as const;

/** 圓環：整體求職準備度 */
function ReadinessRing({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <div className="relative w-[132px] h-[132px] shrink-0">
      <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90">
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--color-border)" strokeWidth="10" />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke="url(#readinessGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id="readinessGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="var(--color-accent-2)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-accent">{pct}%</span>
        <span className="text-[10px] text-fg-muted">求職準備度</span>
      </div>
    </div>
  );
}

export function CareerFunnel({
  stages,
  readiness,
  completedLessonIds,
}: {
  stages: FunnelStage[];
  readiness: number;
  completedLessonIds: string[];
}) {
  const completedSet = useMemo(() => new Set(completedLessonIds), [completedLessonIds]);
  const doneCount = stages.filter((s) => s.done).length;
  const nextStage = stages.find((s) => !s.done) ?? null;

  return (
    <div className="space-y-6">
      {/* 頂部：整體準備度 + 下一步 CTA */}
      <section className="bg-bg-card border border-border rounded-2xl p-5 md:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <ReadinessRing pct={readiness} />
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <Target size={18} className="text-accent shrink-0" />
              <h2 className="font-bold text-lg">求職成果閉環</h2>
            </div>
            <p className="text-sm text-fg-muted mt-1">
              完成 {doneCount} / {stages.length} 個關卡。走完這條路、你就有課程進度、作品、面試手感、證書、履歷——投遞前的東西全備齊。
            </p>
            {nextStage ? (
              <Link
                href={nextStage.href as any}
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 text-white text-sm font-bold hover:opacity-90 transition"
              >
                <Sparkles size={14} />
                下一步：{nextStage.title}
                <ArrowRight size={14} />
              </Link>
            ) : (
              <div className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg bg-green-500/15 text-green-400 text-sm font-bold">
                <CheckCircle2 size={14} /> 全部關卡完成、可以開始投履歷了
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 漏斗：每一關 */}
      <section className="relative">
        <div className="space-y-3">
          {stages.map((s, i) => {
            const Icon = ICONS[s.icon];
            const isNext = nextStage?.key === s.key;
            return (
              <div key={s.key} className="relative">
                {/* 連接線 */}
                {i < stages.length - 1 && (
                  <span className="absolute left-[27px] top-[54px] bottom-[-14px] w-0.5 bg-border" aria-hidden />
                )}
                <Link
                  href={s.href as any}
                  className={`relative flex items-center gap-4 rounded-xl border p-4 transition group ${
                    isNext
                      ? "border-accent bg-accent/5 ring-1 ring-accent/30"
                      : s.done
                        ? "border-green-500/30 bg-green-500/5 hover:border-green-500/50"
                        : "border-border bg-bg-card hover:border-accent/40"
                  }`}
                >
                  {/* 序號 / 狀態圈 */}
                  <div
                    className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${
                      s.done
                        ? "bg-green-500/20 text-green-400"
                        : isNext
                          ? "bg-accent/20 text-accent"
                          : "bg-bg-elevated text-fg-muted"
                    }`}
                  >
                    <Icon size={22} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-fg-muted">關卡 {i + 1}</span>
                      <h3 className="font-bold truncate">{s.title}</h3>
                      {s.done ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400">
                          <CheckCircle2 size={12} /> 完成
                        </span>
                      ) : isNext ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent">
                          <Circle size={12} /> 進行中
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-fg-muted">
                          <Circle size={12} /> 待完成
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-fg-muted mt-0.5">{s.subtitle}</p>
                    {/* 進度條 */}
                    <div className="h-1.5 bg-bg rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full transition-all ${s.done ? "bg-green-500" : "bg-gradient-to-r from-accent to-accent-2"}`}
                        style={{ width: `${Math.max(2, s.progress)}%` }}
                      />
                    </div>
                    <div className="text-[11px] mt-1.5 flex items-center justify-between gap-2">
                      <span className={s.progress > 0 || s.done ? "text-fg" : "text-fg-muted"}>{s.detail}</span>
                      <span className="text-accent font-semibold shrink-0 inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                        {s.done ? "查看" : s.cta} <ArrowRight size={11} />
                      </span>
                    </div>
                    {/* 空狀態引導 */}
                    {!s.done && s.progress === 0 && s.emptyHint && (
                      <p className="text-[11px] text-accent/80 mt-1.5">💡 {s.emptyHint}</p>
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* 技能雷達（沿用既有 SkillRadar、即時 completedSet） */}
      <SkillRadar completedSet={completedSet} />
    </div>
  );
}
