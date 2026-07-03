"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adminHref } from "@/lib/admin-href";
import {
  ADMIN_QUICK_ACTIONS,
  flattenNav,
} from "@/app/admin/nav-items";
import {
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Zap,
  Compass,
  User,
  Receipt,
  Command as CommandIcon,
} from "lucide-react";

type Item = {
  key: string;
  kind: "nav" | "action" | "user" | "order";
  title: string;
  subtitle?: string;
  href: string;
  group: string;
};

type SearchHit = {
  type: "user" | "order";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

/** 超輕量模糊比對：所有查詢字元依序出現即命中，回相關度分數（越小越好）。 */
function fuzzyScore(query: string, target: string): number | null {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (!q) return 0;
  // 直接子字串 → 最高分（用位置當 tie-breaker）
  const idx = t.indexOf(q);
  if (idx !== -1) return idx;
  // 子序列比對
  let ti = 0;
  let gaps = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi];
    const found = t.indexOf(c, ti);
    if (found === -1) return null;
    gaps += found - ti;
    ti = found + 1;
  }
  return 1000 + gaps; // 子序列命中排在子字串之後
}

export function CommandPalette({ isOwner }: { isOwner: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const navItems = useMemo(() => flattenNav(isOwner), [isOwner]);

  // 開/關快捷鍵：Cmd/Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 開啟時 focus input、重置狀態
  useEffect(() => {
    if (open) {
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    } else {
      setQuery("");
      setRemote([]);
    }
  }, [open]);

  // 遠端搜尋（users / orders）— debounce 220ms
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setRemote([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, {
          credentials: "include",
          signal: ctrl.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setRemote(Array.isArray(data.results) ? data.results : []);
        }
      } catch {
        /* aborted or network — ignore */
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, open]);

  // 組合本地（nav + quick actions）候選、依 fuzzy 排序
  const localItems: Item[] = useMemo(() => {
    const nav: Item[] = navItems.map((n) => ({
      key: `nav:${n.href}`,
      kind: "nav",
      title: n.plain || n.label,
      subtitle: n.group,
      href: n.href,
      group: "頁面",
    }));
    const actions: Item[] = ADMIN_QUICK_ACTIONS.filter((a) => !a.ownerOnly || isOwner).map((a) => ({
      key: `action:${a.id}`,
      kind: "action",
      title: a.label,
      subtitle: a.hint,
      href: a.href,
      group: "快速動作",
    }));

    const pool = [...actions, ...nav];
    const q = query.trim();
    if (!q) return pool;

    return pool
      .map((it) => {
        const s = Math.min(
          fuzzyScore(q, it.title) ?? Infinity,
          fuzzyScore(q, it.subtitle ?? "") ?? Infinity,
        );
        return { it, s };
      })
      .filter((x) => x.s !== Infinity)
      .sort((a, b) => a.s - b.s)
      .map((x) => x.it);
  }, [navItems, query, isOwner]);

  const remoteItems: Item[] = useMemo(
    () =>
      remote.map((r) => ({
        key: `${r.type}:${r.id}`,
        kind: r.type,
        title: r.title,
        subtitle: r.subtitle,
        href: r.href,
        group: r.type === "user" ? "使用者" : "訂單",
      })),
    [remote],
  );

  // 最終清單：本地在前、遠端資料在後
  const items: Item[] = useMemo(
    () => [...localItems.slice(0, 40), ...remoteItems],
    [localItems, remoteItems],
  );

  // query 變動時把選取歸零
  useEffect(() => {
    setActive(0);
  }, [query, items.length]);

  const go = useCallback(
    (it: Item | undefined) => {
      if (!it) return;
      setOpen(false);
      router.push(adminHref(it.href) as any);
    },
    [router],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(items[active]);
    }
  };

  // 選取項捲進可視範圍
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4 bg-black/50 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="指令面板"
    >
      <div
        className="w-full max-w-xl bg-bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-fg-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="搜尋頁面、使用者、訂單編號… (輸入 2 字以上查 DB)"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-fg-muted"
            aria-label="搜尋"
            autoComplete="off"
            spellCheck={false}
          />
          {loading && <span className="text-[10px] text-fg-muted animate-pulse">查詢中…</span>}
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated border border-border text-fg-muted hidden sm:inline">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-1">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-fg-muted">
              沒有相符的結果{query.trim().length === 1 ? "（打第 2 個字才會查使用者 / 訂單）" : ""}
            </div>
          ) : (
            items.map((it, i) => (
              <button
                key={it.key}
                data-idx={i}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(it)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left transition ${
                  i === active ? "bg-accent/15" : "hover:bg-bg-elevated"
                }`}
              >
                <span className={`shrink-0 ${i === active ? "text-accent" : "text-fg-muted"}`}>
                  <KindIcon kind={it.kind} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm truncate">{it.title}</span>
                  {it.subtitle && (
                    <span className="block text-[11px] text-fg-muted truncate">{it.subtitle}</span>
                  )}
                </span>
                <span className="shrink-0 text-[10px] text-fg-muted px-1.5 py-0.5 rounded bg-bg-elevated border border-border">
                  {it.group}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="flex items-center gap-3 px-4 py-2 border-t border-border text-[10px] text-fg-muted">
          <span className="inline-flex items-center gap-1">
            <ArrowUp className="w-3 h-3" />
            <ArrowDown className="w-3 h-3" /> 移動
          </span>
          <span className="inline-flex items-center gap-1">
            <CornerDownLeft className="w-3 h-3" /> 前往
          </span>
          <span className="inline-flex items-center gap-1 ml-auto">
            <CommandIcon className="w-3 h-3" /> / Ctrl + K 開關
          </span>
        </div>
      </div>
    </div>
  );
}

function KindIcon({ kind }: { kind: Item["kind"] }) {
  switch (kind) {
    case "action":
      return <Zap className="w-4 h-4" />;
    case "user":
      return <User className="w-4 h-4" />;
    case "order":
      return <Receipt className="w-4 h-4" />;
    default:
      return <Compass className="w-4 h-4" />;
  }
}
