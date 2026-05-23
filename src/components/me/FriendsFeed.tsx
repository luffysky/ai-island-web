"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { formatTWRelative } from "@/lib/format-date";

type FeedItem = {
  kind: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  title: string;
  link?: string;
  at: string;
};

const KIND_LABEL: Record<string, string> = {
  lesson: "📚 完成 lesson",
  achievement: "🏆 解鎖成就",
  blog: "✍️ 發部落格",
  forum_thread: "🗣️ 發論壇主題",
  forum_reply: "💭 論壇回覆",
  level_up: "🎉 升級",
};

export function FriendsFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/feed")
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="rounded-xl bg-bg-card border border-border p-4">
      <h2 className="font-bold mb-3 flex items-center gap-2">📰 全站動態</h2>
      {loading ? (
        <div className="text-center py-6 text-fg-muted text-sm">
          <Loader2 size={14} className="animate-spin inline mr-1" /> 載入中
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-6 text-fg-muted text-sm">最近沒人動、來搶第一個吧</div>
      ) : (
        <ul className="space-y-2 max-h-96 overflow-y-auto">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-bg-elevated text-sm">
              {it.avatar_url ? (
                <Image src={it.avatar_url} alt="" width={24} height={24} unoptimized className="w-6 h-6 rounded-full flex-shrink-0 object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-bg-elevated flex items-center justify-center text-[10px] flex-shrink-0">
                  {(it.display_name || it.username || "?")[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="font-medium">{it.display_name || it.username}</span>
                <span className="text-fg-muted text-xs ml-1">{KIND_LABEL[it.kind] ?? it.kind}</span>
                {it.link ? (
                  <Link href={it.link as any} className="text-xs hover:text-accent ml-1 truncate inline-block max-w-xs align-middle">
                    {it.title}
                  </Link>
                ) : (
                  <span className="text-xs text-fg-muted ml-1 truncate inline-block max-w-xs align-middle">{it.title}</span>
                )}
              </div>
              <span className="text-[10px] text-fg-muted flex-shrink-0">{formatTWRelative(it.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
