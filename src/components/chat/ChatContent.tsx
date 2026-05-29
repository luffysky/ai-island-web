"use client";

import { CopyButton } from "./CopyButton";

/**
 * 渲染訊息內容、自動把 ```code``` block 包成 code box with 複製按鈕
 * 純文字 fallback、不引重型 markdown lib（保持輕量、unicode-safe）
 *
 * 林董：「程式碼區塊右上角加複製按鈕」
 */
export function ChatContent({ text }: { text: string }) {
  if (!text) return null;
  const parts = parseMarkdownBlocks(text);
  return (
    <div className="space-y-1">
      {parts.map((p, i) => {
        if (p.type === "code") {
          return (
            <div key={i} className="relative group/code my-1 rounded-lg bg-bg/80 border border-border overflow-hidden">
              <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-bg-elevated text-[10px] text-fg-muted">
                <span>{p.lang || "code"}</span>
                <CopyButton text={p.code} label="複製" size={10} />
              </div>
              <pre className="p-2 text-xs overflow-x-auto"><code>{p.code}</code></pre>
            </div>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap break-words">
            {p.text}
          </p>
        );
      })}
    </div>
  );
}

type Part = { type: "text"; text: string } | { type: "code"; code: string; lang?: string };

function parseMarkdownBlocks(text: string): Part[] {
  const parts: Part[] = [];
  const re = /```(\w+)?\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      const seg = text.slice(last, m.index);
      if (seg.trim()) parts.push({ type: "text", text: seg });
    }
    parts.push({ type: "code", lang: m[1], code: (m[2] ?? "").replace(/\n$/, "") });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    const seg = text.slice(last);
    if (seg.trim()) parts.push({ type: "text", text: seg });
  }
  if (parts.length === 0) parts.push({ type: "text", text });
  return parts;
}
