"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Eye, Pin, Star, Lock, Flame } from "lucide-react";
import type { ForumThread } from "@/lib/forum-types";

export function ThreadList({ boardSlug }: { boardSlug?: string }) {
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [sort, setSort] = useState<"recent" | "new" | "hot">("recent");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (boardSlug) qs.set("board", boardSlug);
    qs.set("sort", sort);
    fetch(`/api/forum/threads?${qs}`)
      .then((r) => r.json())
      .then((j) => {
        setThreads(j.threads ?? []);
        setLoading(false);
      });
  }, [boardSlug, sort]);

  return (
    <div>
      {/* 排序 */}
      <div className="flex gap-1 mb-3">
        {[
          { key: "recent" as const, label: "最新回覆" },
          { key: "new" as const, label: "最新發表" },
          { key: "hot" as const, label: "最多回覆" },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`text-xs px-3 py-1.5 rounded-lg transition ${
              sort === s.key
                ? "bg-[var(--color-accent)] text-black font-semibold"
                : "bg-[var(--color-bg-card)] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-[var(--color-bg-card)] animate-pulse" />)}
        </div>
      ) : threads.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-fg-muted)]">
          這裡還沒有討論、來發第一篇吧
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Link
              key={t.id}
              href={`/forum/thread/${t.id}`}
              className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 hover:border-[var(--color-accent)] transition"
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
                  <div className="w-9 h-9 rounded-full bg-[var(--color-bg-elevated)] flex items-center justify-center text-sm flex-shrink-0">
                    {(t.author?.display_name || t.author?.username || "?")[0]}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {/* 標題 + 標記 */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {t.is_pinned && <Pin size={13} className="text-[var(--color-accent)]" />}
                    {t.is_featured && <Star size={13} className="text-yellow-400" />}
                    {t.is_locked && <Lock size={13} className="text-[var(--color-fg-muted)]" />}
                    <h3 className="font-bold truncate">{t.title}</h3>
                  </div>
                  {/* 標籤 */}
                  {t.tags?.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {t.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* meta */}
                  <div className="flex items-center gap-3 text-[11px] text-[var(--color-fg-muted)] mt-1.5">
                    <span className="flex items-center gap-0.5">
                      {t.author?.display_name || t.author?.username}
                      <span className="px-1 py-px rounded bg-[var(--color-bg-elevated)] text-[9px] font-bold ml-0.5">
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
                <div className="text-[10px] text-[var(--color-fg-muted)] flex-shrink-0">
                  {new Date(t.last_reply_at).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
