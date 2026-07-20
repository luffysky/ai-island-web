"use client";
import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

/**
 * JSON 互動樹 — 點開/收合巢狀結構、每個值標型別顏色。教 6.1 JSON 是什麼 / 6.6 巢狀結構。
 * config：{ data:<任意 JSON 值>, caption?:string }
 * RWD：整體 overflow-x-auto、字級小、無寫死寬；亮暗用 design token + 型別色。
 */
type Cfg = { data: unknown; caption?: string };

const typeColor: Record<string, string> = {
  string: "text-emerald-600 dark:text-emerald-400",
  number: "text-sky-600 dark:text-sky-400",
  boolean: "text-violet-600 dark:text-violet-400",
  null: "text-fg-muted",
};

function valType(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function Leaf({ v }: { v: unknown }) {
  const t = valType(v);
  const text = t === "string" ? `"${v}"` : String(v);
  return <span className={`font-mono ${typeColor[t] ?? "text-fg"}`}>{text}</span>;
}

function Node({ k, v, depth, defaultOpen }: { k?: string; v: unknown; depth: number; defaultOpen?: boolean }) {
  const t = valType(v);
  const isBranch = t === "object" || t === "array";
  const [open, setOpen] = useState(defaultOpen ?? depth < 1);

  const keyLabel = k !== undefined ? <span className="font-mono text-fg-muted">{k}: </span> : null;

  if (!isBranch) {
    return (
      <div className="whitespace-nowrap" style={{ paddingLeft: depth * 14 }}>
        {keyLabel}
        <Leaf v={v} />
      </div>
    );
  }

  const entries = t === "array"
    ? (v as unknown[]).map((val, i) => [String(i), val] as [string, unknown])
    : Object.entries(v as Record<string, unknown>);
  const open_b = t === "array" ? "[" : "{";
  const close_b = t === "array" ? "]" : "}";

  return (
    <div>
      <div className="whitespace-nowrap cursor-pointer select-none hover:bg-bg-elevated rounded" style={{ paddingLeft: depth * 14 }} onClick={() => setOpen((o) => !o)}>
        <span className="inline-flex items-center align-middle text-fg-muted">{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
        {keyLabel}
        <span className="font-mono text-fg-muted">{open_b}{!open && <span className="text-[10px]"> …{entries.length} </span>}{!open && close_b}</span>
        {!open && <span className="text-[10px] text-fg-muted/70 ml-1">{t === "array" ? "陣列" : "物件"} · {entries.length} 項</span>}
      </div>
      {open && (
        <>
          {entries.map(([ek, ev]) => (
            <Node key={ek} k={t === "array" ? undefined : ek} v={ev} depth={depth + 1} />
          ))}
          <div className="whitespace-nowrap font-mono text-fg-muted" style={{ paddingLeft: depth * 14 }}>{close_b}</div>
        </>
      )}
    </div>
  );
}

export function JsonTree({ title, note, config }: { title?: string; note?: string; config?: Record<string, unknown> }) {
  const cfg = config as unknown as Cfg | undefined;
  if (cfg?.data === undefined) return null;

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-bg-elevated">
        <div className="text-sm font-semibold flex items-center gap-1.5">🌳 {title ?? "點開這個 JSON"}</div>
        {note && <div className="text-xs text-fg-muted mt-0.5">{note}</div>}
      </div>
      {cfg.caption && <div className="px-3 pt-2 text-[11px] text-fg-muted break-words">{cfg.caption}</div>}
      <div className="p-3 overflow-x-auto">
        <div className="text-xs leading-relaxed">
          <Node v={cfg.data} depth={0} defaultOpen />
        </div>
      </div>
      <div className="px-3 pb-2 flex flex-wrap gap-2 text-[10px] text-fg-muted">
        <span className={typeColor.string}>■ string</span>
        <span className={typeColor.number}>■ number</span>
        <span className={typeColor.boolean}>■ boolean</span>
        <span className={typeColor.null}>■ null</span>
        <span>點標題列可收合巢狀結構</span>
      </div>
    </div>
  );
}
