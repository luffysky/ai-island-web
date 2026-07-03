"use client";

import { useEffect, useState } from "react";
import { LottieIcon } from "./LottieIcon";

/**
 * EmptyState 的視覺區塊 — 若 admin 在 /admin/lottie-settings 設了 empty_state_lottie_url、
 * 就播那個 Lottie；沒設 / 載不出來就 fallback 回原本的 lucide icon 或 emoji。
 *
 * fallback 是「原本要顯示的 icon/emoji 節點」、LottieIcon 內建 fallback 機制
 * （未 mount / errored / 空 src 都會 render fallback）→ 永遠不會空白。
 */
export function EmptyStateVisual({
  fallback,
  compact = false,
}: {
  fallback: React.ReactNode;
  compact?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/app-settings?keys=empty_state_lottie_url")
      .then((r) => r.json())
      .then((j) => {
        const u = j?.settings?.empty_state_lottie_url;
        if (alive && typeof u === "string" && u.trim()) setUrl(u.trim());
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const wrapCls = `flex justify-center ${compact ? "mb-1" : "mb-3"}`;

  if (!url) return <div className={wrapCls}>{fallback}</div>;

  return (
    <div className={wrapCls}>
      <LottieIcon src={url} size={compact ? 56 : 84} loop fallback={<>{fallback}</>} />
    </div>
  );
}
