"use client";

import Mention from "@tiptap/extension-mention";
import { mergeAttributes } from "@tiptap/core";
import {
  forwardRef, useEffect, useImperativeHandle, useState,
} from "react";
import { AtSign } from "lucide-react";
import { createSuggestionRenderer } from "./suggestion-popup";

interface MentionUser {
  id: string;
  label: string;
}

/**
 * @ 提及使用者 / 作品。
 * 資料源：先打 `/api/mentions?q=`（目前尚未實作 → 會回 404、graceful 回空陣列）。
 * 之後補一支回 `[{ id, label }]` 的 endpoint 即可自動生效（stub，可日後填）。
 *
 * ⚠️ 存檔 HTML：`<span data-type="mention" data-id="…" class="mention">@label</span>`。
 *    sanitizer 需放行 span 的 data-type / data-id / data-label（見 rich-html-server.ts）。
 */
async function fetchMentionUsers(query: string): Promise<MentionUser[]> {
  try {
    const res = await fetch(`/api/mentions?q=${encodeURIComponent(query)}`, {
      credentials: "include",
    });
    if (!res.ok) return [];
    const j = await res.json();
    const list = Array.isArray(j?.users) ? j.users : Array.isArray(j) ? j : [];
    return list
      .map((u: any) => ({ id: String(u.id ?? u.user_id ?? ""), label: String(u.label ?? u.username ?? u.display_name ?? "") }))
      .filter((u: MentionUser) => u.id && u.label)
      .slice(0, 8);
  } catch {
    return [];
  }
}

const MentionList = forwardRef(function MentionList(props: any, ref) {
  const items: MentionUser[] = props.items ?? [];
  const [sel, setSel] = useState(0);
  useEffect(() => setSel(0), [items]);

  const pick = (i: number) => {
    const item = items[i];
    if (item) props.command({ id: item.id, label: item.label });
  };

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
      <div className="w-[220px] rounded-lg border border-border bg-bg-card p-2 text-xs text-fg-muted shadow-2xl">
        找不到使用者
      </div>
    );
  }

  return (
    <div className="max-h-[260px] w-[220px] overflow-y-auto rounded-lg border border-border bg-bg-card p-1 shadow-2xl">
      {items.map((u, i) => (
        <button
          key={u.id}
          type="button"
          onMouseEnter={() => setSel(i)}
          onClick={() => pick(i)}
          className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition ${
            i === sel ? "bg-accent text-black" : "text-fg hover:bg-bg-elevated"
          }`}
        >
          <AtSign size={15} className="shrink-0" />
          <span className="truncate">{u.label}</span>
        </button>
      ))}
    </div>
  );
});

export const MentionExt = Mention.configure({
  HTMLAttributes: { class: "mention text-accent font-medium" },
  renderHTML({ options, node }) {
    return [
      "span",
      mergeAttributes(
        { "data-type": "mention", "data-id": node.attrs.id, "data-label": node.attrs.label },
        options.HTMLAttributes,
      ),
      `@${node.attrs.label ?? node.attrs.id}`,
    ];
  },
  suggestion: {
    items: ({ query }: { query: string }) => fetchMentionUsers(query),
    render: createSuggestionRenderer(MentionList),
  },
});
