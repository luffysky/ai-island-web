"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Palette, Library, BookOpen, FileText, MessageSquare, Coins, ShoppingBag, ArrowRight, Loader2, History } from "lucide-react";
import { formatTW } from "@/lib/format-date";

type Item = { id: string; kind: string; ts: string; title: string; subtitle?: string; href?: string | null };

const ICON: Record<string, { Icon: any; cls: string }> = {
  creator: { Icon: Palette, cls: "text-pink-400 bg-pink-500/12" },
  work: { Icon: Library, cls: "text-violet-400 bg-violet-500/12" },
  lesson: { Icon: BookOpen, cls: "text-emerald-400 bg-emerald-500/12" },
  note: { Icon: FileText, cls: "text-amber-400 bg-amber-500/12" },
  forum: { Icon: MessageSquare, cls: "text-cyan-400 bg-cyan-500/12" },
  coin: { Icon: Coins, cls: "text-yellow-400 bg-yellow-500/12" },
  purchase: { Icon: ShoppingBag, cls: "text-sky-400 bg-sky-500/12" },
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "creator", label: "創作者島嶼" },
  { key: "lesson", label: "學習" },
  { key: "note", label: "筆記" },
  { key: "forum", label: "討論" },
  { key: "coin", label: "Z 幣" },
];

export function ActivityFeed() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/me/activity")
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const shown = items.filter((it) => {
    if (filter === "all") return true;
    if (filter === "creator") return it.kind === "creator" || it.kind === "work";
    if (filter === "coin") return it.kind === "coin" || it.kind === "purchase";
    return it.kind === filter;
  });

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-accent" /></div>;

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-fg-muted">
        <History size={30} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">還沒有任何操作記錄。去學習、寫筆記、或到創作者島嶼創作吧！</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-full transition ${filter === f.key ? "bg-accent text-black font-semibold" : "bg-bg-card text-fg-muted hover:bg-bg-elevated"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ol className="relative border-l border-border ml-3 space-y-1">
        {shown.map((it) => {
          const ic = ICON[it.kind] ?? ICON.note;
          const Inner = (
            <div className="flex items-start gap-3 py-2.5 pl-4 pr-2 rounded-lg group-hover:bg-bg-elevated/60 transition">
              <span className={`shrink-0 w-8 h-8 rounded-full grid place-items-center ${ic.cls}`}><ic.Icon size={15} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{it.title}</div>
                {it.subtitle && <div className="text-xs text-fg-muted truncate">{it.subtitle}</div>}
                <div className="text-[11px] text-fg-muted mt-0.5">{formatTW(it.ts)}</div>
              </div>
              {it.href && <ArrowRight size={14} className="shrink-0 mt-2 text-fg-muted group-hover:text-accent transition" />}
            </div>
          );
          return (
            <li key={it.id} className="relative -ml-[9px]">
              <span className="absolute left-0 top-5 w-[9px] h-[9px] rounded-full bg-border group-hover:bg-accent" />
              {it.href ? (
                <Link href={it.href as any} className="group block pl-4">{Inner}</Link>
              ) : (
                <div className="group block pl-4">{Inner}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
