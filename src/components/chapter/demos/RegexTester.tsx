"use client";
import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";

/**
 * 正規表達式即時測試器 — 打 pattern + 測試字串，即時高亮比對到哪、列出每個 match 的群組。
 * 「玩了就懂」：改 pattern 立刻看到命中變化，比讀語法表有感。
 * config：{ pattern?, flags?, testString?, note? }（都可省、有預設）。
 * RWD：整體 overflow 自理、字級小、無寫死寬；亮暗用 design token。
 */
type Cfg = { pattern?: string; flags?: string; testString?: string; note?: string };

interface Match { start: number; end: number; text: string; groups: string[] }

export function RegexTester({ title, note, config }: { title?: string; note?: string; config?: Record<string, unknown> }) {
  const cfg = (config ?? {}) as Cfg;
  const [pattern, setPattern] = useState(cfg.pattern ?? "\\b\\w+@\\w+\\.\\w+\\b");
  const [flags, setFlags] = useState(cfg.flags ?? "g");
  const [text, setText] = useState(cfg.testString ?? "聯絡：alice@example.com 或 bob@test.org，亂的 not-an-email 不算。");

  const { matches, error } = useMemo(() => {
    if (!pattern) return { matches: [] as Match[], error: null as string | null };
    try {
      // 保底一定有 g，才能逐個掃；使用者設的 flags 去重合併
      const fl = Array.from(new Set(("g" + flags).split(""))).join("").replace(/[^gimsuy]/g, "");
      const re = new RegExp(pattern, fl);
      const out: Match[] = [];
      let m: RegExpExecArray | null;
      let guard = 0;
      while ((m = re.exec(text)) !== null && guard < 1000) {
        out.push({ start: m.index, end: m.index + m[0].length, text: m[0], groups: m.slice(1).map((g) => g ?? "") });
        if (m[0] === "") re.lastIndex++; // 防空匹配無限迴圈
        guard++;
      }
      return { matches: out, error: null };
    } catch (e) {
      return { matches: [] as Match[], error: (e as Error).message };
    }
  }, [pattern, flags, text]);

  // 把命中片段包成高亮
  const highlighted = useMemo(() => {
    if (!matches.length) return [<span key="0">{text}</span>];
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    matches.forEach((mt, i) => {
      if (mt.start > cursor) parts.push(<span key={`t${i}`}>{text.slice(cursor, mt.start)}</span>);
      parts.push(
        <mark key={`m${i}`} className="rounded bg-amber-300/70 dark:bg-amber-500/40 text-black dark:text-white px-0.5">
          {text.slice(mt.start, mt.end) || "∅"}
        </mark>,
      );
      cursor = mt.end;
    });
    if (cursor < text.length) parts.push(<span key="end">{text.slice(cursor)}</span>);
    return parts;
  }, [matches, text]);

  return (
    <div className="demo-glass overflow-hidden">
      <div className="px-3 py-2 demo-glass-head">
        <div className="text-sm font-semibold flex items-center gap-1.5">🔎 {title ?? "正則測試器 · 即時比對"}</div>
        {(note ?? cfg.note) && <div className="text-xs text-fg-muted mt-0.5">{note ?? cfg.note}</div>}
      </div>

      <div className="p-3 space-y-2.5">
        {/* pattern + flags */}
        <div className="flex items-center gap-1.5">
          <span className="text-fg-muted font-mono text-sm shrink-0">/</span>
          <input value={pattern} onChange={(e) => setPattern(e.target.value)} spellCheck={false}
            className="flex-1 min-w-0 font-mono text-sm bg-bg-elevated border border-border rounded-lg px-2 py-1.5 outline-none focus:border-accent" />
          <span className="text-fg-muted font-mono text-sm shrink-0">/</span>
          <input value={flags} onChange={(e) => setFlags(e.target.value)} spellCheck={false} title="旗標：g i m s"
            className="w-16 font-mono text-sm bg-bg-elevated border border-border rounded-lg px-2 py-1.5 outline-none focus:border-accent" />
        </div>

        {/* 測試字串 */}
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} spellCheck={false}
          placeholder="貼上要測試的文字…"
          className="w-full text-sm bg-bg-elevated border border-border rounded-lg px-2.5 py-2 outline-none focus:border-accent resize-y font-mono leading-relaxed" />

        {/* 即時高亮 */}
        <div>
          <div className="text-[11px] text-fg-muted mb-1 flex items-center gap-1.5">
            {error ? <><X size={12} className="text-rose-500" /> 語法錯誤</> : <><Check size={12} className="text-emerald-500" /> 命中 {matches.length} 處</>}
          </div>
          {error ? (
            <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2 font-mono">{error}</div>
          ) : (
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words rounded-lg bg-bg-elevated border border-border p-2.5 font-mono">
              {highlighted}
            </div>
          )}
        </div>

        {/* 群組明細 */}
        {!error && matches.length > 0 && matches.some((m) => m.groups.length > 0) && (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="text-[11px] text-fg-muted px-2.5 py-1.5 border-b border-border bg-bg-elevated">擷取群組（括號的部分）</div>
            <div className="max-h-40 overflow-auto">
              {matches.slice(0, 20).map((m, i) => (
                <div key={i} className="flex items-start gap-2 px-2.5 py-1.5 text-xs border-b border-border/50 last:border-0">
                  <span className="text-accent font-mono shrink-0">#{i + 1}</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 shrink-0">「{m.text}」</span>
                  {m.groups.length > 0 && (
                    <span className="text-fg-muted font-mono min-w-0">
                      {m.groups.map((g, gi) => <span key={gi} className="mr-2">${gi + 1}={g || "∅"}</span>)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="text-[11px] text-fg-muted">改上面的 pattern 或文字，下面即時更新——這就是練正則最快的方式。</p>
      </div>
    </div>
  );
}
