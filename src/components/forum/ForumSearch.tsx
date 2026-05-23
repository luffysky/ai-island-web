"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, MessageSquare, Eye, Loader2 } from "lucide-react";

export function ForumSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const run = async () => {
    if (q.trim().length < 2) return;
    setLoading(true);
    const res = await fetch(`/api/forum/search?q=${encodeURIComponent(q.trim())}`);
    const json = await res.json();
    setResults(json.results ?? []);
    setSearched(true);
    setLoading(false);
  };

  return (
    <div className="mb-8">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") run(); }}
            placeholder="搜尋討論主題..."
            className="w-full bg-bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={run}
          disabled={q.trim().length < 2 || loading}
          className="px-4 py-2 rounded-lg bg-bg-card border border-border text-sm disabled:opacity-40 flex items-center gap-1 hover:border-accent"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          搜尋
        </button>
      </div>

      {/* 搜尋結果 */}
      {searched && (
        <div className="mt-3">
          {results.length === 0 ? (
            <p className="text-sm text-fg-muted text-center py-4">
              找不到「{q}」相關的討論
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-fg-muted">找到 {results.length} 筆</p>
              {results.map((t) => (
                <Link
                  key={t.id}
                  href={`/forum/thread/${t.id}`}
                  className="block rounded-lg border border-border bg-bg-card p-3 hover:border-accent transition"
                >
                  <h3 className="font-semibold text-sm">{t.title}</h3>
                  <div className="flex items-center gap-3 text-[11px] text-fg-muted mt-1">
                    {t.board && <span>{t.board.emoji} {t.board.name}</span>}
                    <span className="flex items-center gap-0.5"><MessageSquare size={10} /> {t.reply_count}</span>
                    <span className="flex items-center gap-0.5"><Eye size={10} /> {t.view_count}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
