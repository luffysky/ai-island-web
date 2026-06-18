"use client";
import { Lesson } from "@/lib/types";
import { TIP_LABELS } from "@/lib/utils";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { rehypeSmartLang } from "@/lib/rehype-smart-lang";
import { Check, Lock, List, Clock } from "lucide-react";
import { estimateReadingTime, formatReadingTime } from "@/lib/reading-time";
import { motion } from "framer-motion";
import { PlaygroundCard } from "./PlaygroundCard";
import { MiniQuizCard } from "./MiniQuizCard";
import { FilesPanel } from "./FilesPanel";
import { BookmarkButton } from "./BookmarkButton";
import { NotePanel } from "./NotePanel";
import { CodeBlock } from "./CodeBlock";
import { ResourceGroup } from "./ResourceCard";
import { LessonImage } from "./LessonImage";

// 從 markdown content 抽 ### 標題、產生 outline
function extractOutline(content: string): Array<{ text: string; level: number }> {
  const lines = content.split("\n");
  const outline: Array<{ text: string; level: number }> = [];
  for (const line of lines) {
    const m = line.match(/^(#{2,4})\s+(.+)$/);
    if (m) {
      outline.push({ level: m[1].length, text: m[2].trim() });
    }
  }
  return outline;
}

// 掌握徽章樣式
const MASTERY_BADGE: Record<"mastered" | "read" | "skim", { label: string; cls: string }> = {
  mastered: { label: "✓ 已掌握", cls: "bg-green-500/15 text-green-600 dark:text-green-300" },
  read: { label: "已讀完", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-300" },
  skim: { label: "讀過一些", cls: "bg-bg-elevated text-fg-muted" },
};

export function LessonCard({
  lesson,
  index,
  completed,
  isLoggedIn,
  chapterId,
  mastery,
  onComplete,
  onEngage,
}: {
  lesson: Lesson;
  index: number;
  completed: boolean;
  isLoggedIn: boolean;
  chapterId: number;
  mastery?: "mastered" | "read" | "skim" | null;
  onComplete: (lessonId: string, xp: number) => void;
  onEngage?: (patch: { quizPassed?: boolean; playgroundRun?: boolean }) => void;
}) {
  // 預設展開（之前是收起的）
  const [expanded, setExpanded] = useState(true);
  const hasContent = lesson.content && lesson.content.trim().length > 50 && !lesson.content.includes("撰寫中") && !lesson.content.includes("稍後將補回");
  const outline = hasContent ? extractOutline(lesson.content!) : [];
  const readingMinutes = hasContent ? estimateReadingTime(lesson.content!) : 0;

  return (
    <motion.div
      id={`lesson-${lesson.id}`}
      data-lesson-id={lesson.id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
      viewport={{ once: true }}
      className={`relative rounded-xl border ${completed ? "border-accent/40 bg-accent/5" : "border-border bg-bg-card"} p-4 sm:p-6 min-w-0 overflow-hidden`}
    >
      <header className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs text-fg-muted mb-1">{lesson.number}</div>
          <h3 className="text-xl font-bold">{lesson.title}</h3>
        </div>
        <div className="flex items-center gap-1 relative">
          {mastery && !completed && (
            <span className={`text-[10px] px-1.5 py-1 rounded mr-1 ${MASTERY_BADGE[mastery].cls}`} title="依你的閱讀/測驗推估">
              {MASTERY_BADGE[mastery].label}
            </span>
          )}
          {readingMinutes > 0 && (
            <span className="text-[10px] px-1.5 py-1 rounded bg-bg-elevated text-fg-muted mr-1 flex items-center gap-1" title="預估閱讀時間">
              <Clock size={10} /> {formatReadingTime(readingMinutes)}
            </span>
          )}
          <span className="text-xs px-2 py-1 rounded bg-bg-elevated text-warning mr-1">+{lesson.xp} XP</span>
          <BookmarkButton lessonId={lesson.id} chapterId={chapterId} lessonTitle={lesson.title} isLoggedIn={isLoggedIn} />
          <NotePanel lessonId={lesson.id} chapterId={chapterId} isLoggedIn={isLoggedIn} />
          {completed && <span className="w-7 h-7 rounded-full bg-accent flex items-center justify-center ml-1"><Check size={16} className="text-black" /></span>}
        </div>
      </header>

      {/* Simple intro */}
      {lesson.oneLineSummary && (
        <div className="bg-bg-elevated p-4 rounded-lg mb-4">
          <p className="text-base mb-2 leading-relaxed">{lesson.oneLineSummary}</p>
          {lesson.analogy && <p className="text-sm text-fg-muted leading-relaxed">{lesson.analogy}</p>}
        </div>
      )}

      {/* Outline 大綱 */}
      {outline.length > 0 && (
        <div className="bg-bg-elevated border border-border rounded-lg p-3 mb-4">
          <div className="text-xs text-fg-muted mb-2 flex items-center gap-1.5">
            <List size={12} /> 本節大綱（{outline.length} 個重點）
          </div>
          <ul className="space-y-1 text-sm">
            {outline.map((item, i) => (
              <li
                key={i}
                className={item.level >= 3 ? "ml-3 text-fg-muted" : "font-medium"}
              >
                {item.level === 2 ? "▸ " : "・"}{item.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Advanced content - 預設展開 */}
      {hasContent ? (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-accent hover:underline mb-3 inline-flex items-center gap-1"
          >
            {expanded ? "▲ 收起完整說明" : "▼ 展開完整說明"}
          </button>
          {expanded && (
            <div className="prose-custom mb-4 min-w-0 max-w-full overflow-hidden">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSmartLang, [rehypeHighlight, { detect: true }]]}
                components={{
                  // 整段只是裝飾橫線（━━━ / ─── 一長串）→ 改成 CSS 橫線。
                  // 不然手機螢幕窄、那串 ━ 會被斷成好幾行。
                  p: ({ node, children, ...props }: any) => {
                    const text =
                      typeof children === "string"
                        ? children
                        : Array.isArray(children) && children.every((c) => typeof c === "string")
                          ? children.join("")
                          : null;
                    if (text && /^[━─═]{3,}$/.test(text.trim())) {
                      return <hr className="my-3 border-0 border-t border-border" />;
                    }
                    return <p {...props}>{children}</p>;
                  },
                  pre: ({ node, children, ...props }) => {
                    // 從子節點抽 className（hast 結構：pre > code）
                    const codeEl = (children as any)?.props ?? {};
                    return <CodeBlock className={codeEl.className}>{children}</CodeBlock>;
                  },
                  // inline code 維持原樣
                  code: ({ node, className, children, ...props }: any) => {
                    // pre > code 不處理（讓 pre 的 CodeBlock 接手）
                    // inline code 加樣式
                    const isInline = !className?.includes("language-");
                    if (isInline) {
                      return (
                        <code
                          className="px-1.5 py-0.5 rounded bg-bg-elevated text-accent text-[0.9em] font-mono"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  // table 加 overflow scroll、避免撐爆
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3 -mx-1 px-1">
                      <table className="min-w-full text-sm">{children}</table>
                    </div>
                  ),
                  // 圖片：縮圖點一下開全螢幕燈箱放大（原畫質）。見 LessonImage。
                  img: ({ src, alt }) => <LessonImage src={src as string} alt={alt} />,
                }}
              >
                {lesson.content}
              </ReactMarkdown>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 text-sm text-fg-muted my-4">
          <Lock size={14} /> 完整內容撰寫中
        </div>
      )}

      {/* Resource Groups（附錄 I/J 用）*/}
      {lesson.resourceGroups && lesson.resourceGroups.length > 0 && (
        <div className="mt-6 space-y-6">
          {lesson.resourceGroups.map((g, i) => (
            <ResourceGroup
              key={i}
              title={g.title}
              description={g.description}
              resources={g.resources}
            />
          ))}
        </div>
      )}

      {/* 學習園地 Playground - 始終顯示、不被收合 */}
      {lesson.playgrounds && lesson.playgrounds.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-semibold mb-2 flex items-center gap-2">
            🎮 <span>學習園地</span>
          </div>
          {lesson.playgrounds.map((p) => (
            <PlaygroundCard key={p.key} playground={p} lessonId={lesson.id} isLoggedIn={isLoggedIn} onRun={() => onEngage?.({ playgroundRun: true })} />
          ))}
        </div>
      )}

      {/* MiniQuiz */}
      {lesson.miniQuiz && <MiniQuizCard quiz={lesson.miniQuiz} onPass={() => onEngage?.({ quizPassed: true })} />}

      {/* Files */}
      {lesson.files && lesson.files.length > 0 && <FilesPanel files={lesson.files} />}

      {/* Tip */}
      {lesson.tip && (
        <div className={`tip-card tip-${lesson.tip.type} mt-4`}>
          <div className="flex items-center gap-2 mb-2 font-semibold">
            <span>{TIP_LABELS[lesson.tip.type]?.icon}</span>
            <span>{TIP_LABELS[lesson.tip.type]?.label}</span>
          </div>
          <p className="text-sm leading-relaxed">{lesson.tip.text}</p>
        </div>
      )}

      {/* Exercise */}
      {lesson.exercise && (
        <div className="border-t border-border mt-4 pt-4">
          <div className="text-sm font-semibold mb-2 flex items-center gap-2">
            ✏️ <span>動手練習</span>
          </div>
          <p className="text-sm mb-2">{lesson.exercise.question}</p>
          {lesson.exercise.hint && (
            <p className="text-xs text-fg-muted mb-2">💡 提示：{lesson.exercise.hint}</p>
          )}
          <details className="text-xs">
            <summary className="cursor-pointer text-accent">查看建議解答</summary>
            <p className="mt-2 text-fg-muted leading-relaxed">{lesson.exercise.answer}</p>
          </details>
        </div>
      )}

      {/* Complete button */}
      {isLoggedIn && !completed && (
        <button
          onClick={() => onComplete(lesson.id, lesson.xp)}
          className="mt-4 w-full px-4 py-2 bg-accent text-black rounded-lg font-bold hover:scale-[1.02] transition"
        >
          ✓ 標記完成 (+{lesson.xp} XP)
        </button>
      )}
    </motion.div>
  );
}
