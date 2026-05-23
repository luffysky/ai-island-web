"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, Lock } from "lucide-react";
import { CodeBlock } from "@/components/chapter/CodeBlock";
import type { DungeonModule } from "@/data/dungeons";

interface ModuleLessonCardProps {
  module: DungeonModule;
  index: number;
  colorClass: string;   // gradient class
  accentHex: string;
}

export function ModuleLessonCard({ module, index, colorClass, accentHex }: ModuleLessonCardProps) {
  const [open, setOpen] = useState(false);
  const hasContent = !!module.lessonContent;

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      {/* Header - 可點擊展開 */}
      <button
        onClick={() => hasContent && setOpen((v) => !v)}
        className={`w-full flex items-start gap-4 p-5 text-left ${
          hasContent ? "hover:bg-bg-elevated cursor-pointer" : "cursor-default"
        } transition`}
      >
        <div
          className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-sm bg-gradient-to-br ${colorClass} text-black`}
        >
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold mb-1 flex items-center gap-2">
            {module.title}
          </h3>
          <p className="text-sm text-fg-muted leading-relaxed mb-2">
            {module.desc}
          </p>
          <div className="flex flex-wrap gap-1">
            {module.skills.map((s) => (
              <span
                key={s}
                className="text-[10px] px-2 py-0.5 rounded-full bg-bg-elevated text-fg-muted"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        {hasContent ? (
          <ChevronDown
            size={18}
            className={`shrink-0 mt-1 transition-transform ${open ? "rotate-180" : ""}`}
            style={{ color: accentHex }}
          />
        ) : (
          <Lock size={14} className="shrink-0 mt-1.5 text-fg-muted" />
        )}
      </button>

      {/* 展開的教學內文 */}
      {open && hasContent && (
        <div className="border-t border-border p-5 sm:p-6 min-w-0 overflow-hidden">
          <div className="prose-custom max-w-full overflow-hidden">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre: ({ children }) => {
                  const codeEl = (children as any)?.props ?? {};
                  return <CodeBlock className={codeEl.className}>{children}</CodeBlock>;
                },
                code: ({ className, children, ...props }: any) => {
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
                  return <code className={className} {...props}>{children}</code>;
                },
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3 -mx-1 px-1">
                    <table className="min-w-full text-sm">{children}</table>
                  </div>
                ),
              }}
            >
              {module.lessonContent}
            </ReactMarkdown>
          </div>

          {/* 練習 */}
          {module.practice && (
            <div
              className="mt-6 rounded-xl border p-4"
              style={{ borderColor: accentHex + "55", background: accentHex + "0d" }}
            >
              <div className="font-bold text-sm mb-2 flex items-center gap-2">
                ✏️ <span>動手練習</span>
              </div>
              <p className="text-sm leading-relaxed mb-3">{module.practice.task}</p>
              <details className="text-sm">
                <summary className="cursor-pointer text-fg-muted hover:text-fg">
                  💡 看提示
                </summary>
                <p className="mt-2 text-fg-muted leading-relaxed">
                  {module.practice.hint}
                </p>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
