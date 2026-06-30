"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const INTERVAL_MS = 60_000;  // 60 秒

export function AutoRefresh() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(60);

  const refresh = useCallback(() => {
    router.refresh();
    setLastRefresh(new Date());
    setCountdown(60);
  }, [router]);

  useEffect(() => {
    if (!enabled) return;
    const tick = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          refresh();
          return 60;
        }
        return c - 1;
      });
    }, 1_000);
    return () => window.clearInterval(tick);
  }, [enabled, refresh]);

  return (
    <div className="flex items-center gap-2 text-[11px] text-fg-muted">
      <button
        onClick={() => setEnabled((e) => !e)}
        className={`px-2 py-1 rounded border transition ${
          enabled
            ? "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
            : "bg-bg-elevated border-border hover:border-accent"
        }`}
        title={enabled ? "點擊暫停自動更新" : "點擊啟用自動更新"}
      >
        {enabled ? (
          <>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse mr-1.5" />
            自動更新中 ({countdown}s)
          </>
        ) : (
          <>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-fg-muted/50 mr-1.5" />
            自動更新已暫停
          </>
        )}
      </button>
      <button
        onClick={refresh}
        className="px-2 py-1 rounded border border-border bg-bg-elevated hover:border-accent transition inline-flex items-center gap-1"
        title="立即重新整理（不重 page、只重抓資料）"
      >
        <RefreshCw className="w-3 h-3" /> 立即更新
      </button>
      <span className="text-[10px] opacity-70">
        上次：{lastRefresh.toLocaleTimeString("zh-TW", { hour12: false })}
      </span>
    </div>
  );
}
