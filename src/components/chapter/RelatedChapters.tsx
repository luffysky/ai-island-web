import Link from "next/link";
import { ArrowRight, ArrowLeft, Layers, BookOpen } from "lucide-react";
import { getChapterMetas } from "@/lib/content";
import type { Chapter } from "@/lib/types";
import { chapterDisplayNumberById } from "@/lib/chapter-display";

/**
 * Internal linking 強化 — 章節頁尾推薦相關章節
 * 規則：
 *  1. 先列「上一章 / 下一章」(依 sortIndex / id)
 *  2. 再列「同 stage 其他章節」3-4 個 (主題相關)
 *  3. 給 Google / AI 抓到完整 internal link graph
 */
export async function RelatedChapters({ chapter }: { chapter: Chapter }) {
  const all = await getChapterMetas();

  // 找在排序裡的位置
  const sorted = [...all].sort((a, b) => ((a as any).sortIndex ?? a.id) - ((b as any).sortIndex ?? b.id));
  const idx = sorted.findIndex((c) => c.id === chapter.id);
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;

  // 同 stage 其他章節 (排除自己 / 上下章)
  const stageSiblings = sorted
    .filter((c) =>
      c.stage === chapter.stage &&
      c.id !== chapter.id &&
      c.id !== prev?.id &&
      c.id !== next?.id
    )
    .slice(0, 4);

  return (
    <section className="mt-8 space-y-4">
      {/* 上一章 / 下一章 */}
      {(prev || next) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {prev ? (
            <Link
              href={`/chapters/${prev.id}` as any}
              className="block p-4 rounded-2xl border border-border bg-bg-card hover:border-accent hover:bg-bg-elevated/40 transition group"
            >
              <div className="text-[10px] text-fg-muted mb-1 inline-flex items-center gap-1"><ArrowLeft size={11} /> 上一章</div>
              <div className="font-bold text-sm group-hover:text-accent transition">
                Ch{chapterDisplayNumberById(prev.id)} {prev.title}
              </div>
              <div className="text-[10px] text-fg-muted line-clamp-1 mt-0.5">{prev.subtitle}</div>
            </Link>
          ) : <div />}
          {next ? (
            <Link
              href={`/chapters/${next.id}` as any}
              className="block p-4 rounded-2xl border border-border bg-bg-card hover:border-accent hover:bg-bg-elevated/40 transition group text-right"
            >
              <div className="text-[10px] text-fg-muted mb-1 inline-flex items-center gap-1">下一章 <ArrowRight size={11} /></div>
              <div className="font-bold text-sm group-hover:text-accent transition">
                Ch{chapterDisplayNumberById(next.id)} {next.title}
              </div>
              <div className="text-[10px] text-fg-muted line-clamp-1 mt-0.5">{next.subtitle}</div>
            </Link>
          ) : <div />}
        </div>
      )}

      {/* 同 stage 其他章節 */}
      {stageSiblings.length > 0 && (
        <div className="rounded-2xl border border-border bg-bg-card p-4">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Layers size={14} className="text-purple-400" />
            同 Stage {chapter.stage} 其他章節
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {stageSiblings.map((c) => (
              <Link
                key={c.id}
                href={`/chapters/${c.id}` as any}
                className="block p-3 rounded-xl border border-border bg-bg hover:border-purple-400/50 hover:bg-bg-elevated/40 transition group"
              >
                <div className="text-[10px] text-fg-muted">Ch{chapterDisplayNumberById(c.id)}</div>
                <div className="text-xs font-bold mt-0.5 group-hover:text-accent transition line-clamp-1">{c.title}</div>
                <div className="text-[9px] text-fg-muted line-clamp-1 mt-0.5">{c.subtitle}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 回章節列表 */}
      <Link
        href={"/chapters" as any}
        className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-accent transition"
      >
        <BookOpen size={11} />
        看所有章節 <ArrowRight size={11} />
      </Link>
    </section>
  );
}
