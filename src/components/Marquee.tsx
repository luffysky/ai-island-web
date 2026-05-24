"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Megaphone, X } from "lucide-react";

type Broadcast = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

const DISMISS_KEY = "marquee-dismissed-ids";

export function Marquee() {
  const pathname = usePathname() || "/";
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);

  // 不在 admin、auth callback、login 顯示
  const hide =
    pathname.startsWith("/admin") ||
    pathname.includes("/auth/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) setDismissed(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (hide) return;
    fetch("/api/marquee")
      .then((r) => r.json())
      .then((j) => setBroadcasts(j.broadcasts ?? []))
      .catch(() => {});
  }, [hide]);

  // 循環播放
  useEffect(() => {
    const visible = broadcasts.filter((b) => !dismissed.includes(b.id));
    if (visible.length <= 1) {
      setIdx(0);
      return;
    }
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % visible.length);
    }, 6000);
    return () => clearInterval(t);
  }, [broadcasts, dismissed]);

  if (hide) return null;
  const visible = broadcasts.filter((b) => !dismissed.includes(b.id));
  if (visible.length === 0) return null;

  const current = visible[Math.min(idx, visible.length - 1)];

  const dismissAll = () => {
    const next = [...new Set([...dismissed, ...visible.map((b) => b.id)])];
    setDismissed(next);
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch {}
  };

  return (
    <div className="relative border-b border-border bg-gradient-to-r from-accent/15 via-accent-2/10 to-accent/15">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-3">
        <Megaphone size={14} className="shrink-0 text-accent" />
        <div key={current.id} className="flex-1 min-w-0 text-xs sm:text-sm animate-fade-in">
          <span className="font-bold mr-2">{current.title}</span>
          <span className="text-fg-muted">{current.content}</span>
        </div>
        {visible.length > 1 && (
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-fg-muted">
            {visible.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition ${
                  i === idx ? "bg-accent" : "bg-fg-muted/30"
                }`}
              />
            ))}
          </div>
        )}
        <button
          onClick={dismissAll}
          className="shrink-0 text-fg-muted hover:text-fg transition p-0.5"
          aria-label="關閉公告"
          title="不再顯示這些公告"
        >
          <X size={14} />
        </button>
      </div>
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
      `}</style>
    </div>
  );
}
