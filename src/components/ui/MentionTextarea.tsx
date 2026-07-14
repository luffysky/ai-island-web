"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// @ 提及：純 textarea 版（討論區/留言用）。輸入 @字 → 叫 /api/mentions 搜使用者 → 選一個插入可讀的 @顯示名。
// 送出前用 resolveMentions() 把選過的 @顯示名 換成儲存 token [[user:uuid|label]]（顯示端 renderContent 會渲染成可點連結）。
export type Mention = { id: string; label: string };

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 把使用者選過的 @label 轉成儲存用 token；長 label 先換（避免短的先吃掉一部分）。
export function resolveMentions(text: string, picks: Mention[]): string {
  let out = text;
  const uniq = Array.from(new Map(picks.map((p) => [p.id + "|" + p.label, p])).values())
    .sort((a, b) => b.label.length - a.label.length);
  for (const p of uniq) {
    // 只換「還沒被 token 化」的 @label（後面不接 uuid 收尾）；label 前面不是字元（避免 email 之類誤傷）
    const re = new RegExp(`(^|[^\\w[])@${escapeRegExp(p.label)}(?![\\w])`, "g");
    out = out.replace(re, (_m, pre) => `${pre}[[user:${p.id}|${p.label}]]`);
  }
  return out;
}

// 從已存內容抽出被提及的 user id（給後端通知用；前端 optimistic 不需要）
export function parseMentionIds(content: string): string[] {
  const ids = new Set<string>();
  const re = /\[\[user:([0-9a-fA-F-]{36})\|[^\]]*\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) ids.add(m[1]);
  return [...ids];
}

type Props = {
  value: string;
  onChange: (v: string) => void;
  onPick: (m: Mention) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onInput?: (e: React.FormEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  style?: React.CSSProperties;
  autoFocus?: boolean;
};

export function MentionTextarea({ value, onChange, onPick, onKeyDown, onInput, placeholder, rows = 3, className, style, autoFocus }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Mention[]>([]);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const anchorRef = useRef<number>(-1); // @ 的位置

  // 偵測游標前是否正在打 @字（@ 後面沒有空白/換行）
  const detect = useCallback((el: HTMLTextAreaElement) => {
    const pos = el.selectionStart ?? 0;
    const before = el.value.slice(0, pos);
    const m = before.match(/(^|[\s(])@([^\s@]{0,20})$/);
    if (m) {
      anchorRef.current = pos - m[2].length - 1; // @ 的 index
      setQuery(m[2]);
      setOpen(true);
    } else {
      setOpen(false);
      anchorRef.current = -1;
    }
  }, []);

  // 搜尋（debounce）
  useEffect(() => {
    if (!open) return;
    const h = setTimeout(async () => {
      try {
        const r = await fetch(`/api/mentions?q=${encodeURIComponent(query)}`, { credentials: "include" });
        const d = await r.json().catch(() => ({ users: [] }));
        const list: Mention[] = (d.users ?? []).map((u: any) => ({ id: u.id, label: u.label }));
        setItems(list);
        setActive(0);
      } catch { setItems([]); }
    }, 160);
    return () => clearTimeout(h);
  }, [open, query]);

  const choose = (m: Mention) => {
    const el = ref.current;
    if (!el || anchorRef.current < 0) return;
    const pos = el.selectionStart ?? 0;
    const at = anchorRef.current;
    const inserted = `@${m.label} `;
    const next = value.slice(0, at) + inserted + value.slice(pos);
    onChange(next);
    onPick(m);
    setOpen(false);
    anchorRef.current = -1;
    // 還原焦點 + 把游標移到插入文字之後
    requestAnimationFrame(() => {
      el.focus();
      const caret = at + inserted.length;
      try { el.setSelectionRange(caret, caret); } catch { /* ignore */ }
    });
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (open && items.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % items.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + items.length) % items.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); choose(items[active]); return; }
      if (e.key === "Escape") { setOpen(false); return; }
    }
    onKeyDown?.(e);
  };

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        placeholder={placeholder}
        className={className}
        style={style}
        autoFocus={autoFocus}
        onChange={(e) => { onChange(e.target.value); detect(e.currentTarget); }}
        onClick={(e) => detect(e.currentTarget)}
        onKeyUp={(e) => detect(e.currentTarget)}
        onInput={onInput}
        onKeyDown={handleKey}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && items.length > 0 && (
        <div className="absolute z-40 left-2 top-full mt-0.5 w-60 max-h-56 overflow-auto surface-glass shadow-xl rounded-lg p-1">
          {items.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); choose(m); }}
              className={`w-full text-left px-2 py-1.5 text-sm rounded flex items-center gap-2 ${i === active ? "bg-accent/15 text-accent" : "hover:bg-bg-elevated"}`}
            >
              <span className="w-6 h-6 rounded-full bg-bg-elevated flex items-center justify-center text-xs shrink-0">{m.label[0]}</span>
              <span className="truncate">@{m.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
