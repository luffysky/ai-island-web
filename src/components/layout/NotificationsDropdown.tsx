"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Bell, Loader2, Check } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useOverlayRegister } from "@/lib/overlay-stack";
import { formatTWRelative } from "@/lib/format-date";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePopover, PopoverPanel } from "@/components/ui/Popover";

type Notif = {
  id: string;
  kind: string;
  title: string;
  body?: string;
  link?: string;
  read_at: string | null;
  created_at: string;
};

const KIND_EMOJI: Record<string, string> = {
  achievement: "🏆",
  level_up: "🎉",
  forum_reply: "💭",
  comment: "💬",
  follow: "👥",
  system: "🔔",
  reward: "🎁",
};

export function NotificationsDropdown() {
  const { user } = useAuth();
  const popover = usePopover({ placement: "bottom-end", maxWidth: 360 });
  const { open, setOpen } = popover;
  useOverlayRegister(open);
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);

  // 載 unread count（30 秒 poll）
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = () => {
      fetch("/api/me/notifications?count_only=1")
        .then((r) => r.json())
        .then((j) => { if (!cancelled) setUnread(j.unread ?? 0); })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [user?.id]);

  // open 時撈列表
  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    fetch("/api/me/notifications")
      .then((r) => r.json())
      .then((j) => { setItems(j.items ?? []); setUnread(0); })
      .finally(() => setLoading(false));
  }, [open, user?.id]);

  const markAllRead = async () => {
    await fetch("/api/me/notifications/mark-all-read", {
      credentials: "include", method: "POST" });
    setItems((arr) => arr.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnread(0);
  };

  if (!user) return null;

  return (
    <>
      <button
        ref={popover.refs.setReference}
        {...popover.getReferenceProps()}
        className="relative p-1.5 rounded-lg hover:bg-bg-card transition"
        aria-label="通知"
        title="通知"
      >
        <Bell size={17} className={unread > 0 ? "text-accent" : ""} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-3.5 h-3.5 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center pointer-events-none">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      <PopoverPanel api={popover} className="w-80 max-w-[calc(100vw-1rem)]">
        <header className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-1.5">🔔 通知</h3>
          {items.some((n) => !n.read_at) && (
            <button onClick={markAllRead} className="text-[10px] text-accent hover:underline inline-flex items-center gap-0.5">
              <Check size={11} /> 全標已讀
            </button>
          )}
        </header>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-fg-muted text-xs"><Loader2 size={14} className="animate-spin inline mr-1" /> 載入中</div>
          ) : items.length === 0 ? (
            <EmptyState emoji="🌱" title="目前沒通知" desc="完成 lesson / 收到回覆會出現在這" compact />
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id} className={`p-3 hover:bg-bg-elevated text-xs ${!n.read_at ? "bg-accent/5" : ""}`}>
                  {n.link ? (
                    <Link href={n.link as any} onClick={() => setOpen(false)} className="flex items-start gap-2">
                      <span className="text-base shrink-0">{KIND_EMOJI[n.kind] ?? "🔔"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{n.title}</div>
                        {n.body && <div className="text-fg-muted line-clamp-2 mt-0.5">{n.body}</div>}
                        <div className="text-[10px] text-fg-muted mt-1">{formatTWRelative(n.created_at)}</div>
                      </div>
                      {!n.read_at && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" />}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-2">
                      <span className="text-base shrink-0">{KIND_EMOJI[n.kind] ?? "🔔"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{n.title}</div>
                        {n.body && <div className="text-fg-muted line-clamp-2 mt-0.5">{n.body}</div>}
                        <div className="text-[10px] text-fg-muted mt-1">{formatTWRelative(n.created_at)}</div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverPanel>
    </>
  );
}
