import { CAREER_PATHS } from "@/lib/types";
import { getChapterMetas } from "@/lib/content";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function CareerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const path = CAREER_PATHS[id as keyof typeof CAREER_PATHS];
  if (!path) notFound();

  const all = await getChapterMetas();
  const chapters = path.chapters.map(cid => all.find(c => c.id === cid)).filter(Boolean) as any[];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">{path.emoji}</div>
        <h1 className="text-3xl font-bold mb-2">{path.name}</h1>
        <div className="text-[var(--color-accent)] mb-3">→ {path.title}</div>
        <p className="text-[var(--color-fg-muted)] max-w-xl mx-auto">{path.description}</p>
      </div>

      <h2 className="text-xl font-bold mb-4">推薦學習順序（{chapters.length} 章）</h2>
      <div className="space-y-2">
        {chapters.map((ch, i) => (
          <Link key={ch.id} href={`/chapters/${ch.id}`} className="flex items-center gap-4 p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-accent)]">
            <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] flex items-center justify-center font-bold text-sm">{i + 1}</div>
            <div className="flex-1">
              <div className="font-semibold">{ch.title}</div>
              <div className="text-sm text-[var(--color-fg-muted)]">{ch.subtitle}</div>
            </div>
            <div className="text-xs text-[var(--color-fg-muted)]">{ch.lessonCount} lessons</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  return Object.keys(CAREER_PATHS).map(id => ({ id }));
}
