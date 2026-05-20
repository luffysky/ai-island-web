import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DUNGEONS, getDungeon } from "@/data/dungeons";
import { getDungeonLesson } from "@/data/dungeon-lessons";
import { ModuleLessonCard } from "@/components/courses/ModuleLessonCard";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

const PRICE_LABEL: Record<string, { label: string; color: string }> = {
  free: { label: "免費", color: "bg-green-500/20 text-green-400" },
  paid: { label: "付費", color: "bg-orange-500/20 text-orange-400" },
  freemium: { label: "部分免費", color: "bg-blue-500/20 text-blue-400" },
};

export function generateStaticParams() {
  return DUNGEONS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const d = getDungeon(slug);
  if (!d) return { title: "找不到副本 | AI 島" };

  const title = `${d.name}：${d.subtitle} | AI 島`;
  return {
    title,
    description: `${d.tagline}。${d.intro.slice(0, 80)}`,
    alternates: { canonical: `${SITE_URL}/courses/${d.slug}` },
    openGraph: {
      title,
      description: d.tagline,
      url: `${SITE_URL}/courses/${d.slug}`,
      images: [`${SITE_URL}/api/og?title=${encodeURIComponent(d.name)}&subtitle=${encodeURIComponent(d.subtitle)}`],
    },
  };
}

export default async function DungeonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const d = getDungeon(slug);
  if (!d) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 min-w-0 overflow-hidden">
      {/* 麵包屑 */}
      <div className="text-sm text-[var(--color-fg-muted)] mb-6">
        <Link href="/courses" className="hover:text-[var(--color-fg)]">
          ⚔️ AI 任務副本
        </Link>
        {" / "}
        <span>{d.name}</span>
      </div>

      {/* Hero */}
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold bg-gradient-to-br ${d.color} text-black`}
          >
            {d.no}
          </div>
          <span className="text-5xl">{d.emoji}</span>
        </div>
        <h1 className="text-4xl font-bold mb-2">{d.name}</h1>
        <p className="text-lg text-[var(--color-fg-muted)] mb-1">{d.subtitle}</p>
        <p className="text-xl" style={{ color: d.accentHex }}>
          {d.tagline}
        </p>
      </header>

      {/* 簡介 */}
      <section className="mb-10">
        <p className="text-base leading-relaxed">{d.intro}</p>
      </section>

      {/* Boss 戰 */}
      <section className="mb-10">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
              副本 BOSS
            </span>
            <h2 className="text-2xl font-bold">👹 {d.boss.name}</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-red-400/80 font-semibold mb-1">⚠️ 你會遇到</div>
              <p className="text-[var(--color-fg-muted)] leading-relaxed">{d.boss.symptom}</p>
            </div>
            <div>
              <div className="text-yellow-400/80 font-semibold mb-1">🎯 弱點</div>
              <p>{d.boss.weakness}</p>
            </div>
            <div>
              <div className="text-green-400/80 font-semibold mb-1">⚔️ 破解方式</div>
              <p className="text-[var(--color-fg-muted)] leading-relaxed">{d.boss.howToBeat}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 適合誰 + 學完能做什麼 */}
      <section className="mb-10 grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <h3 className="font-bold mb-3">👥 這個副本適合</h3>
          <ul className="space-y-2 text-sm">
            {d.whoFor.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span style={{ color: d.accentHex }}>·</span>
                <span className="text-[var(--color-fg-muted)]">{w}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <h3 className="font-bold mb-3">🎁 通關後你會</h3>
          <ul className="space-y-2 text-sm">
            {d.outcomes.map((o, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-green-400">✓</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 學習模組 */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-2">📚 副本關卡</h2>
        <p className="text-sm text-[var(--color-fg-muted)] mb-4">
          點開每個關卡、看完整教學內容。
        </p>
        <div className="space-y-3">
          {d.modules.map((m, i) => {
            // merge 教學內文進 module
            const lesson = getDungeonLesson(d.slug, i);
            const moduleWithContent = lesson
              ? { ...m, lessonContent: lesson.content, practice: lesson.practice }
              : m;
            return (
              <ModuleLessonCard
                key={i}
                module={moduleWithContent}
                index={i}
                colorClass={d.color}
                accentHex={d.accentHex}
              />
            );
          })}
        </div>
      </section>

      {/* 推薦工具 */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">🛠️ 推薦工具</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {d.tools.map((t) => (
            <a
              key={t.name}
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 hover:border-[var(--color-accent)] transition flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold group-hover:text-[var(--color-accent)] transition">
                    {t.name}
                  </h3>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${PRICE_LABEL[t.price].color}`}
                  >
                    {PRICE_LABEL[t.price].label}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-fg-muted)] leading-relaxed">
                  {t.desc}
                </p>
              </div>
              <span className="text-[var(--color-fg-muted)] group-hover:text-[var(--color-accent)] shrink-0">
                ↗
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* 通關技巧 */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">💡 通關技巧</h2>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <ul className="space-y-3">
            {d.proTips.map((tip, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black"
                  style={{ background: d.accentHex }}
                >
                  {i + 1}
                </span>
                <span className="leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 相關章節 */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">🔗 相關主課程章節</h2>
        <p className="text-sm text-[var(--color-fg-muted)] mb-3">
          副本是實戰、主課程是底子。這些章節能幫你打好基礎：
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {d.relatedChapters.map((c) => (
            <Link
              key={c.id}
              href={`/chapters/${c.id}`}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 hover:border-[var(--color-accent)] transition flex items-center gap-3"
            >
              <span className="text-xs font-mono text-[var(--color-fg-muted)] shrink-0">
                Ch{String(c.id).padStart(2, "0")}
              </span>
              <span className="text-sm font-medium">{c.title}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-elevated)] p-8 text-center">
        <h2 className="text-2xl font-bold mb-2">準備好挑戰 {d.boss.name} 了嗎？</h2>
        <p className="text-sm text-[var(--color-fg-muted)] mb-5">
          先打好基礎、再進副本實戰。註冊就送 100 Z-coin。
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/signup"
            className="px-6 py-3 bg-[var(--color-accent)] text-black rounded-lg font-bold hover:scale-105 transition-transform"
          >
            🚀 開始冒險
          </Link>
          <Link
            href="/courses"
            className="px-6 py-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-accent)] transition"
          >
            看其他副本
          </Link>
        </div>
      </section>

      {/* 其他副本 */}
      <section className="mt-10">
        <h3 className="text-sm font-bold text-[var(--color-fg-muted)] mb-3">其他副本</h3>
        <div className="flex flex-wrap gap-2">
          {DUNGEONS.filter((x) => x.slug !== d.slug).map((x) => (
            <Link
              key={x.slug}
              href={`/courses/${x.slug}`}
              className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-accent)] transition text-sm flex items-center gap-2"
            >
              <span>{x.emoji}</span>
              <span>{x.name}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
