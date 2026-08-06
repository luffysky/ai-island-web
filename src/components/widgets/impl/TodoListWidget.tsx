"use client";
// P2：待辦狀態先存 localStorage（keyed by instanceId）；P3 config-save API 上線後改存 config.items。
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { WidgetProps } from "@/lib/widgets/types";

type Cfg = { title?: string };
type Item = { id: string; text: string; done: boolean };

export default function TodoListWidget({ instanceId, config }: WidgetProps) {
  const c = (config ?? {}) as Cfg;
  const key = `widget-todo-${instanceId}`;
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState("");
  useEffect(() => { try { const r = localStorage.getItem(key); if (r) setItems(JSON.parse(r)); } catch { /* ignore */ } }, [key]);
  const save = (n: Item[]) => { setItems(n); try { localStorage.setItem(key, JSON.stringify(n)); } catch { /* ignore */ } };
  const add = () => { const t = input.trim(); if (!t) return; save([...items, { id: String(Date.now()), text: t, done: false }]); setInput(""); };
  const done = items.filter((i) => i.done).length;

  return (
    <div className="h-full flex flex-col p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-fg-muted">{c.title || "待辦"}</div>
        {items.length > 0 && <span className="text-[10px] text-fg-muted">{done}/{items.length}</span>}
      </div>
      <div className="flex gap-1.5 mb-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="加一件…" className="flex-1 min-w-0 rounded-lg border border-border bg-transparent px-2 py-1 text-sm outline-none focus:border-accent" />
        <button onClick={add} className="shrink-0 rounded-lg bg-accent text-black px-2.5 py-1 text-sm">＋</button>
      </div>
      <ul className="flex-1 overflow-auto space-y-1">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-2 group">
            <button onClick={() => save(items.map((x) => x.id === it.id ? { ...x, done: !x.done } : x))} className={`shrink-0 w-4 h-4 rounded border grid place-items-center ${it.done ? "bg-accent border-accent text-black" : "border-border"}`}>{it.done && <span className="text-[10px]">✓</span>}</button>
            <span className={`flex-1 text-sm ${it.done ? "line-through text-fg-muted" : "text-fg"}`}>{it.text}</span>
            <button onClick={() => save(items.filter((x) => x.id !== it.id))} className="shrink-0 text-fg-muted opacity-0 group-hover:opacity-100"><X size={12} /></button>
          </li>
        ))}
        {items.length === 0 && <li className="text-xs text-fg-muted py-1">還沒有待辦。</li>}
      </ul>
    </div>
  );
}
