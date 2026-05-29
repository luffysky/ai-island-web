"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Eye, Pin, Star, Lock, Flame, Loader2 } from "lucide-react";
import type { ForumThread } from "@/lib/forum-types";
import { EmptyState } from "@/components/ui/EmptyState";
import { useVirtualizer } from "@tanstack/react-virtual";

const VIRTUALIZE_THRESHOLD = 40; // 超過 40 才虛擬化（少於不必要的 overhead）

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
        <EmptyState emoji="💭" title="還沒有討論" desc="想到什麼就問一句、開啟對話吧" action={{ label: "發第一篇", href: `/forum/new${boardSlug ? `?board=${boardSlug}` : ""}` }} />
      ) : (
        threads.length >= VIRTUALIZE_THRESHOLD ? (
          <VirtualThreads
            threads={threads}
            boardSlug={boardSlug}
            hasMore={hasMore}
            loadingMore={loadingMore}
            sentinelRef={sentinelRef}
          />
        ) : (
          <div className="space-y-2">
            {threads.map((t) => (
              <ThreadCard key={t.id} t={t} boardSlug={boardSlug} />
            ))}

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
        )
      )}
    </div>
  );
}

function ThreadCard({ t, boardSlug }: { t: ForumThread; boardSlug?: string }) {
  return (
    <Link
      href={`/forum/thread/${t.id}` as any}
      className="block rounded-xl border border-border bg-bg-card p-4 hover:border-accent transition"
    >
      <div className="flex items-start gap-3">
        {t.author?.avatar_url ? (
          <Image
            src={t.author.avatar_url}
            alt=""
            width={36}
            height={36}
            unoptimized
            className="w-9 h-9 rounded-full shrink-0 object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-bg-elevated flex items-center justify-center text-sm shrink-0">
            {(t.author?.display_name || t.author?.username || "?")[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {t.is_pinned && <Pin size={13} className="text-accent" />}
            {t.is_featured && <Star size={13} className="text-yellow-400" />}
            {t.is_locked && <Lock size={13} className="text-fg-muted" />}
            <h3 className="font-bold truncate">{t.title}</h3>
          </div>
          {t.tags?.length > 0 && (
            <div className="flex gap-1 mt-1">
              {t.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">
                  #{tag}
                </span>
              ))}
            </div>
          )}
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
        <div className="text-[10px] text-fg-muted shrink-0">
          {new Date(t.last_reply_at).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" })}
        </div>
      </div>
    </Link>
  );
}

function VirtualThreads({ threads, boardSlug, hasMore, loadingMore, sentinelRef }: {
  threads: ForumThread[];
  boardSlug?: string;
  hasMore: boolean;
  loadingMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: threads.length + (hasMore ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 110,
    overscan: 6,
  });

  return (
    <div ref={parentRef} style={{ height: "75vh", overflow: "auto" }} className="rounded-xl border border-border">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const isLast = vi.index >= threads.length;
          const t = threads[vi.index];
          return (
            <div
              key={isLast ? "sentinel" : t.id}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vi.start}px)`, padding: 4 }}
            >
              {isLast ? (
                <div ref={sentinelRef} className="py-4 flex items-center justify-center text-xs text-fg-muted">
                  {loadingMore ? (
                    <span className="flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" /> 載入更多...
                    </span>
                  ) : (
                    <span>↓ 滾動載入更多</span>
                  )}
                </div>
              ) : (
                <ThreadCard t={t} boardSlug={boardSlug} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
