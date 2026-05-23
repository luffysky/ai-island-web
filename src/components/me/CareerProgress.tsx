import { CAREER_PATHS } from "@/lib/types";
import { chapters } from "@/data/chapters";
import Link from "next/link";

/**
 * 解鎖工作力 — 用「該職涯路線完成的 lesson / 該路線總 lesson」算 %。
 *
 * 林董 2026-05-23：
 *   不要用「章節完成數」當進度、用「解鎖工作力 %」更直覺。
 *   完成第 1 章不代表能投履歷、應該說「解鎖前端工作力 20%」這種尺度。
 */
export function CareerProgress({
  completedSet,
}: {
  completedSet: Set<string>; // 已完成 lesson_id 的 Set
}) {
  const paths = Object.values(CAREER_PATHS).map((path) => {
    const pathChapters = chapters.filter((c) => (path.chapters as readonly number[]).includes(c.id));
    const totalLessons = pathChapters.reduce((s, c) => s + c.lessons.length, 0);
    const doneLessons = pathChapters.reduce(
      (s, c) => s + c.lessons.filter((l) => completedSet.has(l.id)).length,
      0,
    );
    const pct = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0;
    return {
      ...path,
      total: totalLessons,
      done: doneLessons,
      pct,
    };
  });

  // 排序：解鎖度高的在前
  paths.sort((a, b) => b.pct - a.pct);

  const tier = (pct: number) =>
    pct >= 80 ? { label: "🎓 大師級", color: "text-purple-400" }
    : pct >= 60 ? { label: "🚀 進階", color: "text-blue-400" }
    : pct >= 30 ? { label: "🌱 入門", color: "text-green-400" }
    : pct > 0 ? { label: "🌰 萌芽", color: "text-yellow-400" }
    : { label: "⏳ 未開始", color: "text-fg-muted" };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold flex items-center gap-2">🛠️ 解鎖工作力</h2>
        <Link href={"/career" as any} className="text-xs text-accent hover:underline">看完整路線 →</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {paths.map((p) => {
          const t = tier(p.pct);
          return (
            <Link
              key={p.id}
              href={`/career/${p.id}` as any}
              className="bg-bg-card border border-border hover:border-accent/50 rounded-xl p-4 transition group"
            >
              <div className="flex items-start gap-3 mb-2">
                <span className="text-2xl flex-shrink-0">{p.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold truncate">{p.name}</h3>
                    <span className={`text-[10px] font-bold ${t.color}`}>{t.label}</span>
                  </div>
                  <p className="text-xs text-fg-muted mt-0.5 line-clamp-1">{p.title}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-extrabold text-accent">{p.pct}%</div>
                  <div className="text-[10px] text-fg-muted">{p.done}/{p.total}</div>
                </div>
              </div>
              <div className="h-2 bg-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-accent-2 transition-all"
                  style={{ width: `${p.pct}%` }}
                />
              </div>
              <p className="text-[11px] text-fg-muted mt-2 line-clamp-1">{p.description}</p>
            </Link>
          );
        })}
      </div>
      <p className="text-[11px] text-fg-muted mt-3 text-center">
        💡 解鎖工作力 ≥ 60% 才建議投對應職位履歷
      </p>
    </section>
  );
}
