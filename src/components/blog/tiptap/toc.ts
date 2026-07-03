import type { Editor } from "@tiptap/react";

/** 目錄項目。id 為由標題文字產生的 slug（消費端可拿來做錨點）。 */
export interface TocItem {
  level: number;
  text: string;
  id: string;
}

function slugify(text: string, index: number): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[\s]+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "");
  return base ? `h-${index}-${base}`.slice(0, 80) : `h-${index}`;
}

/** 從 editor 內文的 h1~h6 產生目錄。 */
export function computeToc(editor: Editor): TocItem[] {
  const items: TocItem[] = [];
  let i = 0;
  editor.state.doc.descendants((node) => {
    if (node.type.name === "heading") {
      const text = node.textContent.trim();
      if (text) {
        items.push({ level: node.attrs.level ?? 1, text, id: slugify(text, i) });
        i += 1;
      }
    }
    return true;
  });
  return items;
}

/**
 * 預估閱讀時間（分鐘）。中文以字數為主（~350 字/分）、英文以詞數為輔（~220 詞/分），取較大者。
 */
export function estimateReadingMinutes(chars: number, words: number): number {
  const byChar = chars / 350;
  const byWord = words / 220;
  return Math.max(1, Math.round(Math.max(byChar, byWord)));
}

export interface EditorStats {
  toc: TocItem[];
  readingMinutes: number;
  chars: number;
  words: number;
}

export function computeStats(editor: Editor): EditorStats {
  const chars = editor.storage.characterCount?.characters?.() ?? 0;
  const words = editor.storage.characterCount?.words?.() ?? 0;
  return {
    toc: computeToc(editor),
    readingMinutes: estimateReadingMinutes(chars, words),
    chars,
    words,
  };
}
