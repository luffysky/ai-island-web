import Link from "next/link";
import type { Metadata } from "next";
import { DUNGEONS } from "@/data/dungeons";
import { SITE_STATS } from "@/lib/site-stats";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

export const metadata: Metadata = {
  title: "AI 任務副本 | AI 島",
  description: "5 大 AI 實戰副本：文案、圖像、影片、自動化、程式。打敗 boss、掌握 AI 應用力。",
  alternates: { canonical: `${SITE_URL}/courses` },
  openGraph: {
    title: "AI 任務副本 — 5 大實戰副本",
    description: "文案 / 圖像 / 影片 / 自動化 / 程式、選一個副本開始挑戰。",
    url: `${SITE_URL}/courses`,
    images: [`${SITE_URL}/api/og?title=AI 任務副本&subtitle=5 大實戰副本`],
  },
};

export default function CoursesPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-[var(--color-bg-card)] border border-[var(--color-border)] mb-4">
          ⚔️ <span>實戰應用區</span>
        </div>
        <h1 className="text-4xl font-bold mb-3">AI 任務副本</h1>
        <p className="text-[var(--color-fg-muted)] max-w-2xl mx-auto leading-relaxed">
          {SITE_STATS.chapterCount} 章主課程打底、5 大副本實戰。每個副本鎖定一個 AI 應用方向、
          打敗副本 boss、你就掌握了一項能變現的技能。
        </p>
      </div>

      {/* 副本格 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {DUNGEONS.map((d) => (
          <Link
            key={d.slug}
            href={`/courses/${d.slug}`}
            className={`group rounded-2xl border ${d.border} p-6 hover:scale-[1.02] transition-transform flex flex-col`}
          >
            {/* Top */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br ${d.color} text-black`}
                >
                  {d.no}
                </div>
                <span className="text-3xl">{d.emoji}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold self-start mt-1">
                BOSS 戰
              </span>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold mb-1">{d.name}</h2>
            <div className="text-sm text-[var(--color-fg-muted)] mb-3">{d.subtitle}</div>
            <p className="text-sm leading-relaxed mb-4 flex-1">{d.tagline}</p>

            {/* Boss */}
            <div className="border-t border-[var(--color-border)] pt-3 mb-3">
              <div className="text-xs text-[var(--color-fg-muted)] mb-1">副本 BOSS</div>
              <div className="font-semibold text-sm flex items-center gap-1">
                👹 {d.boss.name}
              </div>
            </div>

            {/* Tools preview */}
            <div className="flex flex-wrap gap-1">
              {d.tools.slice(0, 3).map((t) => (
                <span
                  key={t.name}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)]"
                >
                  {t.name}
                </span>
              ))}
              {d.tools.length > 3 && (
                <span className="text-[10px] px-2 py-0.5 text-[var(--color-fg-muted)]">
                  +{d.tools.length - 3}
                </span>
              )}
            </div>

            <div
              className="mt-4 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all"
              style={{ color: d.accentHex }}
            >
              進入副本 →
            </div>
          </Link>
        ))}
      </div>

      {/* 底部說明 */}
      <div className="mt-12 p-6 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-center">
        <h3 className="font-bold mb-2">🗺️ 副本怎麼玩？</h3>
        <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed max-w-2xl mx-auto">
          每個副本都有一隻 boss——代表你在這個領域最容易卡住的問題。
          副本內容教你打敗它的方法、推薦工具、以及對應的主課程章節。
          不用全部都打、選你最想要的能力開始。
        </p>
      </div>
    </div>
  );
}
