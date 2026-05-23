"use client";
import Link from "next/link";
import React from "react";

// 把純文字裡的 "Ch12"、"第 12 章"、"Ch12 第 3 課"、"Ch12.3" 等變成連結
// 處理 plain text node、回傳 mixed array of strings + ReactElements

const PATTERNS: Array<{
  re: RegExp;
  toUrl: (m: RegExpMatchArray) => string;
  toLabel: (m: RegExpMatchArray) => string;
}> = [
  // "Ch12 第 3 課" / "Ch12 lesson 3"
  {
    re: /Ch(\d{1,2})\s*(?:第\s*(\d+)\s*(?:課|lesson|個 lesson)|lesson\s*(\d+)|第\s*(\d+)\s*節)/gi,
    toUrl: (m) => `/chapters/${Number(m[1])}#lesson-${Number(m[1])}.${Number(m[2] || m[3] || m[4])}`,
    toLabel: (m) => `Ch${Number(m[1]).toString().padStart(2, "0")} 第 ${m[2] || m[3] || m[4]} 課`,
  },
  // "Ch12.3" / "Ch12-3"
  {
    re: /Ch(\d{1,2})[.\-](\d+)/g,
    toUrl: (m) => `/chapters/${Number(m[1])}#lesson-${Number(m[1])}.${Number(m[2])}`,
    toLabel: (m) => `Ch${Number(m[1]).toString().padStart(2, "0")}.${Number(m[2])}`,
  },
  // "Ch12" / "第 12 章" / "Chapter 12"
  {
    re: /(?:Ch(?:apter)?\s*(\d{1,2})|第\s*(\d{1,2})\s*章)/gi,
    toUrl: (m) => `/chapters/${Number(m[1] || m[2])}`,
    toLabel: (m) => `Ch${Number(m[1] || m[2]).toString().padStart(2, "0")}`,
  },
];

export function linkifyChapterRefs(text: string): React.ReactNode[] {
  if (!text) return [text];

  // 找出所有 match、排序、然後分段
  type Match = {
    start: number;
    end: number;
    url: string;
    label: string;
  };
  const matches: Match[] = [];

  for (const { re, toUrl, toLabel } of PATTERNS) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        url: toUrl(m),
        label: toLabel(m),
      });
    }
  }

  // 排序 + 移除重疊（保留最早出現的、最長的）
  matches.sort((a, b) => a.start - b.start || b.end - a.end);
  const filtered: Match[] = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      filtered.push(m);
      lastEnd = m.end;
    }
  }

  if (filtered.length === 0) return [text];

  // 切片
  const result: React.ReactNode[] = [];
  let cursor = 0;
  filtered.forEach((m, i) => {
    if (m.start > cursor) result.push(text.slice(cursor, m.start));
    result.push(
      <Link
        key={`${m.start}-${i}`}
        href={m.url as any}
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-accent/15 text-accent hover:bg-accent/25 text-xs font-mono no-underline"
      >
        📖 {m.label}
      </Link>
    );
    cursor = m.end;
  });
  if (cursor < text.length) result.push(text.slice(cursor));
  return result;
}

// React component 包裝、給 ReactMarkdown 用
export function LinkifiedText({ children }: { children: React.ReactNode }) {
  if (typeof children !== "string") return <>{children}</>;
  return <>{linkifyChapterRefs(children)}</>;
}
