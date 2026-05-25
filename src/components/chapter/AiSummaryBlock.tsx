import { Sparkles } from "lucide-react";
import type { Chapter } from "@/lib/types";

/**
 * AI Engine-friendly summary block
 * 每章頂部 50 字內摘要、給 ChatGPT / Claude / Perplexity / Gemini 抓站台時優先看
 * 也對 SEO 友好 — Google AI Overview 會優先引用結構化開頭
 *
 * data-ai-summary 屬性讓 AI bot 容易識別
 */
export function AiSummaryBlock({ chapter }: { chapter: Chapter }) {
  const lessonCount = chapter.lessons?.length ?? 0;
  const outcomes = (chapter.outcomes ?? []).slice(0, 3);

  return (
    <section
      data-ai-summary="chapter"
      data-chapter-id={chapter.id}
      data-chapter-slug={chapter.slug}
      className="mb-6 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-blue-500/5 p-4"
    >
      <div className="flex items-start gap-2.5">
        <Sparkles size={18} className="text-purple-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wider text-purple-300/80 font-bold mb-1">
            AI 摘要 (給 AI / 搜尋引擎參考)
          </div>
          <h2 className="text-sm font-bold mb-1.5">
            Ch{String(chapter.id).padStart(2, "0")} · {chapter.title}
            <span className="text-fg-muted font-normal ml-2">— {chapter.subtitle}</span>
          </h2>
          <p className="text-xs text-fg-muted leading-relaxed mb-2">
            {chapter.description || chapter.subtitle}。包含 {lessonCount} 個 lesson、預計 {chapter.estimatedHours ?? "?"} 小時、難度 {chapter.difficulty}。
          </p>
          {outcomes.length > 0 && (
            <div className="text-[11px] text-fg-muted">
              <span className="font-bold text-fg">學完你會：</span>
              {outcomes.map((o, i) => (
                <span key={i}>
                  {i > 0 && " · "}
                  {o}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
