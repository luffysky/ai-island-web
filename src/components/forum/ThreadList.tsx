"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Eye, Pin, Star, Lock, Flame, Loader2 } from "lucide-react";
import type { ForumThread } from "@/lib/forum-types";

const PAGE_SIZE = 20;

export function ThreadList({ boardSlug }: { boardSlug?: string }) {
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [sort, setSort] = useState<"recent" | "new" | "hot" | "trending">("recent");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 換 board / sort 重抓
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHasMore(false);
    const qs = new URLSearchParams();
    if (boardSlug) qs.set("board", boardSlug);
    qs.set("sort", sort);
    qs.set("offset", "0");
    qs.set("limit", String(PAGE_SIZE));
    fetch(`/api/forum/threads?${qs}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setThreads(j.threads ?? []);
        setHasMore(!!j.hasMore);
        setLoading(false);
      })
      .catch(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [boardSlug, sort]);

  // 無限滾動：IntersectionObserver 監看 sentinel
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, loadingMore, threads.length]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const qs = new URLSearchParams();
      if (boardSlug) qs.set("board", boardSlug);
      qs.set("sort", sort);
      qs.set("offset", String(threads.length));
      qs.set("limit", String(PAGE_SIZE));
      const res = await fetch(`/api/forum/threads?${qs}`);
      const j = await res.json();
      setThreads((prev) => [...prev, ...(j.threads ?? [])]);
      setHasMore(!!j.hasMore);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div>
      {/* 排序 */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {[
          { key: "trending" as const, label: "🔥 熱門演算法" },
          { key: "recent" as const, label: "最新回覆" },
          { key: "new" as const, label: "最新發表" },
          { key: "hot" as const, label: "最多回覆" },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`text-xs px-3 py-1.5 rounded-lg transition ${
              sort === s.key
                ? "bg-accent text-black font-semibold"
                : "bg-bg-card text-fg-muted hover:bg-bg-elevated"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-bg-card animate-pulse" />)}
        </div>
      ) : threads.length === 0 ? (
        <div className="text-center py-12 text-fg-muted">
          這裡還沒有討論、來發第一篇吧
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Link
              key={t.id}
              href={`/forum/thread/${t.id}` as any}
              className="block rounded-xl border border-border bg-bg-card p-4 hover:border-accent transition"
            >
              <div className="flex items-start gap-3">
                {/* 作者頭像 */}
                {t.author?.avatar_url ? (
                  <Image
                    src={t.author.avatar_url}
                    alt=""
                    width={36}
                    height={36}
                    unoptimized
                    className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-bg-elevated flex items-center justify-center text-sm flex-shrink-0">
                    {(t.author?.display_name || t.author?.username || "?")[0]}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {/* 標題 + 標記 */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {t.is_pinned && <Pin size={13} className="text-accent" />}
                    {t.is_featured && <Star size={13} className="text-yellow-400" />}
                    {t.is_locked && <Lock size={13} className="text-fg-muted" />}
                    <h3 className="font-bold truncate">{t.title}</h3>
                  </div>
                  {/* 標籤 */}
                  {t.tags?.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {t.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* meta */}
                  <div className="flex items-center gap-3 text-[11px] text-fg-muted mt-1.5">
                    <span className="flex items-center gap-0.5">
                      {t.author?.display_name || t.author?.username}
                      <span className="px-1 py-px rounded bg-bg-elevated text-[9px] font-bold ml-0.5">
                        Lv{t.author?.level ?? 1}
                      </span>
                    </span>
                    {t.board && !boardSlug && (
                      <span>{t.board.emoji} {t.board.name}</span>
                    )}
                    <span className="flex items-center gap-0.5"><MessageSquare size={11} /> {t.reply_count}</span>
                    <span className="flex items-center gap-0.5"><Eye size={11} /> {t.view_count}</span>
                  </div>
                </div>
                {/* 最後回覆時間 */}
                <div className="text-[10px] text-fg-muted flex-shrink-0">
                  {new Date(t.last_reply_at).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" })}
                </div>
              </div>
            </Link>
          ))}

          {/* 無限滾動 sentinel + 載入指示 */}
          {hasMore && (
            <div ref={sentinelRef} className="py-4 flex items-center justify-center text-xs text-fg-muted">
              {loadingMore ? (
                <span className="flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> 載入更多...
                </span>
              ) : (
                <span>↓ 滾動載入更多</span>
              )}
            </div>
          )}
          {!hasMore && threads.length >= PAGE_SIZE && (
            <div className="py-4 text-center text-xs text-fg-muted">已經到底了 🏝️</div>
          )}
        </div>
      )}
    </div>
  );
}
