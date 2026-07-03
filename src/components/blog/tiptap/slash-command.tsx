"use client";

import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import {
  forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState,
} from "react";
import {
  Heading1, Heading2, Heading3, List as ListIcon, ListOrdered, CheckSquare,
  Quote, FileCode, Table as TableIcon, Minus, Image as ImageIcon,
  Info, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { createSuggestionRenderer } from "./suggestion-popup";

export interface SlashItem {
  title: string;
  keywords: string;
  Icon: any;
  run: (editor: Editor, range: Range) => void;
}

const ITEMS: SlashItem[] = [
  { title: "標題 1", keywords: "h1 heading title 標題", Icon: Heading1, run: (e, r) => e.chain().focus().deleteRange(r).toggleHeading({ level: 1 }).run() },
  { title: "標題 2", keywords: "h2 heading 標題", Icon: Heading2, run: (e, r) => e.chain().focus().deleteRange(r).toggleHeading({ level: 2 }).run() },
  { title: "標題 3", keywords: "h3 heading 標題", Icon: Heading3, run: (e, r) => e.chain().focus().deleteRange(r).toggleHeading({ level: 3 }).run() },
  { title: "項目清單", keywords: "bullet list ul 項目 清單", Icon: ListIcon, run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
  { title: "編號清單", keywords: "ordered list ol number 編號", Icon: ListOrdered, run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
  { title: "待辦清單", keywords: "task todo check 待辦", Icon: CheckSquare, run: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run() },
  { title: "引言", keywords: "quote blockquote 引言 引用", Icon: Quote, run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
  { title: "程式碼區塊", keywords: "code codeblock 程式 程式碼", Icon: FileCode, run: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run() },
  { title: "表格", keywords: "table 表格", Icon: TableIcon, run: (e, r) => e.chain().focus().deleteRange(r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { title: "分隔線", keywords: "hr divider rule 分隔", Icon: Minus, run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
  { title: "圖片", keywords: "image img photo 圖片 圖", Icon: ImageIcon, run: (e, r) => { e.chain().focus().deleteRange(r).run(); e.view.dom.dispatchEvent(new CustomEvent("blogeditor:pick-image")); } },
  { title: "提示框：注意", keywords: "callout info note 注意 提示", Icon: Info, run: (e, r) => e.chain().focus().deleteRange(r).setCallout("info").run() },
  { title: "提示框：警告", keywords: "callout warn warning 警告 提示", Icon: AlertTriangle, run: (e, r) => e.chain().focus().deleteRange(r).setCallout("warn").run() },
  { title: "提示框：成功", keywords: "callout success ok 成功 提示", Icon: CheckCircle2, run: (e, r) => e.chain().focus().deleteRange(r).setCallout("success").run() },
];

const SlashList = forwardRef(function SlashList(props: any, ref) {
  const items: SlashItem[] = props.items ?? [];
  const [sel, setSel] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => setSel(0), [items]);

  const pick = (i: number) => {
    const item = items[i];
    if (item) props.command(item);
  };

  useLayoutEffect(() => {
    const node = listRef.current?.children[sel] as HTMLElement | undefined;
    node?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowDown") { setSel((s) => (s + 1) % Math.max(1, items.length)); return true; }
      if (event.key === "ArrowUp") { setSel((s) => (s - 1 + items.length) % Math.max(1, items.length)); return true; }
      if (event.key === "Enter") { pick(sel); return true; }
      return false;
    },
  }));

  if (!items.length) {
    return (
      <div className="w-[240px] rounded-lg border border-border bg-bg-card p-2 text-xs text-fg-muted shadow-2xl">
        找不到指令
      </div>
    );
  }

  return (
    <div ref={listRef} className="max-h-[280px] w-[240px] overflow-y-auto rounded-lg border border-border bg-bg-card p-1 shadow-2xl">
      {items.map((item, i) => {
        const Icon = item.Icon;
        return (
          <button
            key={item.title}
            type="button"
            onMouseEnter={() => setSel(i)}
            onClick={() => pick(i)}
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition ${
              i === sel ? "bg-accent text-black" : "text-fg hover:bg-bg-elevated"
            }`}
          >
            <Icon size={16} className="shrink-0" />
            <span>{item.title}</span>
          </button>
        );
      })}
    </div>
  );
});

export const SlashCommand = Extension.create({
  name: "slashCommand",
  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        char: "/",
        startOfLine: true,
        allowSpaces: false,
        command: ({ editor, range, props }) => props.run(editor, range),
        items: ({ query }) => {
          const q = query.toLowerCase().trim();
          if (!q) return ITEMS;
          return ITEMS.filter(
            (it) => it.title.toLowerCase().includes(q) || it.keywords.toLowerCase().includes(q),
          );
        },
        render: createSuggestionRenderer(SlashList),
      }),
    ];
  },
});
