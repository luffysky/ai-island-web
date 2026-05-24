import Link from "next/link";
import { recommendChapters } from "@/lib/chapter-recommend";
import { getChapterMetas } from "@/lib/content";
import { Sparkles } from "lucide-react";

const REASON_LABEL: Record<string, { emoji: string; text: string }> = {
  collab: { emoji: "👥", text: "相似學員也在學" },
  continuation: { emoji: "📈", text: "下一步" },
  popular: { emoji: "🔥", text: "全站熱門" },
};

export async function RecommendedChapters({ userId }: { userId: string }) {
  const [recs, chapters] = await Promise.all([
    recommendChapters(userId, 4),
    getChapterMetas(),
  ]);

  if (recs.length === 0) return null;

  const chapterMap = new Map<number, any>(chapters.map((c) => [c.id, c]));

  return (
    <section className="space-y-3">
      <h2 className="font-bold flex items-center gap-2">
        <Sparkles size={16} className="text-accent" />
        為你推薦
        <span className="text-[10px] text-fg-muted font-normal">演算法 #8 · 依你已完成章節找相似學員的選擇</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {recs.map((r) => {
          const ch = chapterMap.get(r.chapterId);
          if (!ch) return null;
          const tag = REASON_LABEL[r.reason] ?? REASON_LABEL.popular;
          return (
            <Link
              key={r.chapterId}
              href={`/chapters/${r.chapterId}` as any}
              className="bg-bg-card border border-border hover:border-accent/50 rounded-xl p-4 transition group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-fg-muted">Ch {String(r.chapterId).padStart(2, "0")}</div>
                  <h3 className="font-bold truncate group-hover:text-accent transition">{ch.title}</h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent flex-shrink-0">
                  {tag.emoji} {tag.text}
                </span>
              </div>
              {ch.subtitle && (
                <p className="text-xs text-fg-muted line-clamp-2">{ch.subtitle}</p>
              )}
              <div className="text-[10px] text-fg-muted mt-2">
                {ch.lessonCount ?? 0} 個 lesson
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
