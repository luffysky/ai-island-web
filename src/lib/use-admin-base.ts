"use client";

import { useEffect, useState } from "react";

/**
 * 取得後台路徑（client 端）。
 *
 * 密路徑不能寫進 bundle，所以改由 /api/admin/base 在執行期供給，
 * 且該端點只回應已驗證的後台人員。非後台人員永遠拿到 null，
 * 後台入口也就不會被渲染出來。
 *
 * @param enabled 呼叫端已知道自己是後台人員時才傳 true。
 *                預設 false，避免每位訪客都打一次這支 API。
 */
let cached: string | null = null;
let inflight: Promise<string | null> | null = null;

async function fetchAdminBase(): Promise<string | null> {
  if (cached) return cached;

  inflight ??= fetch("/api/admin/base", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) return null;
      const body = (await response.json()) as { base?: string };
      cached = body.base ?? null;
      return cached;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function useAdminBase(enabled: boolean): string | null {
  const [base, setBase] = useState<string | null>(cached);

  useEffect(() => {
    if (!enabled || base) return;

    let active = true;
    void fetchAdminBase().then((value) => {
      if (active) setBase(value);
    });

    return () => {
      active = false;
    };
  }, [enabled, base]);

  return enabled ? base : null;
}
