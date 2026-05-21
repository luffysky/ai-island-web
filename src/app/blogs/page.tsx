"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Eye, Loader2 } from "lucide-react";

export default function BlogExplorePage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (q.trim().length < 2) return;
    setLoading(true);
    const res = await fetch(`/api/blog/search?q=${encodeURIComponent(q.trim())}`);
    const json = await res.json();
    setResults(json.results ?? []);
    setSearched(true);
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold mb-2 text-center">📝 部落格探索</h1>
      <p className="text-[var(--color-fg-muted)] text-center mb-6">
        搜尋 AI 島社群的文章
      </p>

      {/* 搜尋框 */}
      <div className="flex gap-2 mb-8">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-fg-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") search(); }}
            placeholder="輸入關鍵字（標題、摘要、標籤）"
            className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        <button
          onClick={search}
          disabled={q.trim().length < 2 || loading}
          className="px-5 py-2.5 rounded-lg bg-[var(--color-accent)] text-black font-semibold text-sm disabled:opacity-40 flex items-center gap-1"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          搜尋
        </button>
      </div>

      {/* 結果 */}
      {searched && !loading && results.length === 0 && (
        <p className="text-center text-[var(--color-fg-muted)] py-10">
          找不到「{q}」相關的文章
        </p>
      )}

      <div className="space-y-3">
        {results.map((a) => (
          <Link
            key={a.id}
            href={`/blogs/${a.blog_slug}/${a.slug}`}
            className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 hover:border-[var(--color-accent)] transition group flex gap-4"
          >
            {a.cover_image && (
              <img src={a.cover_image} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              {a.category && (
                <span className="text-xs text-[var(--color-accent)]">{a.category}</span>
              )}
              <h2 className="font-bold group-hover:text-[var(--color-accent)] transition">{a.title}</h2>
              {a.summary && (
                <p className="text-sm text-[var(--color-fg-muted)] line-clamp-2 mt-0.5">{a.summary}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-[var(--color-fg-muted)] mt-1">
                <span className="flex items-center gap-1"><Eye size={11} /> {a.view_count}</span>
                <span>{new Date(a.published_at).toLocaleDateString("zh-TW")}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
