"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { Search, X, Loader2, BookA } from "lucide-react";

type Term = { slug: string; term: string; zh_name: string | null; category: string; langs: string[]; plain: string; difficulty: number };

const CATS: { id: string; label: string }[] = [
  { id: "", label: "全部" },
  { id: "syntax", label: "語法" },
  { id: "concept", label: "概念" },
  { id: "slang", label: "黑話" },
  { id: "tool", label: "工具" },
  { id: "error", label: "錯誤" },
];
const LANGS: { id: string; label: string }[] = [
  { id: "", label: "所有語言" },
  { id: "general", label: "通用" },
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "sql", label: "SQL" },
];
const CAT_STYLE: Record<string, string> = {
  syntax: "bg-sky-500/15 text-sky-500",
  concept: "bg-emerald-500/15 text-emerald-500",
  slang: "bg-fuchsia-500/15 text-fuchsia-500",
  tool: "bg-amber-500/15 text-amber-500",
  error: "bg-rose-500/15 text-rose-500",
};
const CAT_LABEL: Record<string, string> = { syntax: "語法", concept: "概念", slang: "黑話", tool: "工具", error: "錯誤" };
const DIFF = ["", "新手", "一般", "進階"];

export function DictionaryBrowse() {
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [lang, setLang] = useState("");
  const [items, setItems] = useState<Term[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async (reset: boolean) => {
    setLoading(true);
    const off = reset ? 0 : offset;
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (cat) p.set("category", cat);
    if (lang) p.set("lang", lang);
    if (locale && locale !== "zh") p.set("locale", locale);
    p.set("offset", String(off));
    try {
      const r = await fetch(`/api/dictionary?${p.toString()}`).then((x) => x.json());
      const next = (r.items ?? []) as Term[];
      setItems((prev) => (reset ? next : [...prev, ...next]));
      setTotal(r.total ?? 0);
      setOffset(off + (r.limit ?? 40));
    } catch { /* ignore */ } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, cat, lang, offset]);

  // 篩選 / 搜尋變動 → debounce 重新查（reset）
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setOffset(0); load(true); }, 250);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, cat, lang]);

  return (
    <div className="space-y-4">
      {/* 搜尋 */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜尋術語、中文名或解釋…（例：async、技術債、404）"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-bg-card border border-border text-sm outline-none focus:border-accent"
        />
        {q && <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"><X size={15} /></button>}
      </div>

      {/* 篩選 */}
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar-d pb-0.5">
          {CATS.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition ${cat === c.id ? "bg-accent text-black" : "bg-bg-card border border-border text-fg-muted hover:text-fg"}`}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar-d pb-0.5">
          {LANGS.map((l) => (
            <button key={l.id} onClick={() => setLang(l.id)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs transition ${lang === l.id ? "bg-accent/20 text-accent ring-1 ring-accent/40" : "bg-bg-card border border-border text-fg-muted hover:text-fg"}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-fg-muted">{loading && items.length === 0 ? "載入中…" : `${total} 個詞`}</div>

      {/* 卡片 */}
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((t) => (
          <Link key={t.slug} href={`/dictionary/${t.slug}` as any}
            className="block rounded-2xl border border-border bg-bg-card p-4 hover:border-accent/50 hover:shadow-md transition group">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-fg group-hover:text-accent transition break-all">{t.term}</span>
              {t.zh_name && <span className="text-sm text-fg-muted">{t.zh_name}</span>}
            </div>
            <p className="mt-1.5 text-sm text-fg-muted line-clamp-2 leading-relaxed">{t.plain}</p>
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CAT_STYLE[t.category] ?? "bg-bg-elevated text-fg-muted"}`}>{CAT_LABEL[t.category] ?? t.category}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">{DIFF[t.difficulty] ?? "新手"}</span>
              {(t.langs ?? []).filter((l) => l !== "general").slice(0, 2).map((l) => (
                <span key={l} className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">{l}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {!loading && items.length === 0 && (
        <div className="text-center text-fg-muted py-16 flex flex-col items-center gap-2">
          <BookA size={28} className="opacity-50" /> 找不到符合的詞，換個關鍵字試試
        </div>
      )}

      {/* 載入更多 */}
      {items.length < total && (
        <div className="text-center pt-2">
          <button onClick={() => load(false)} disabled={loading}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl border border-border bg-bg-card text-sm hover:border-accent/50 disabled:opacity-50">
            {loading ? <Loader2 size={15} className="animate-spin" /> : null} 載入更多（{items.length}/{total}）
          </button>
        </div>
      )}
      <style>{`.no-scrollbar-d::-webkit-scrollbar{display:none}.no-scrollbar-d{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
}
