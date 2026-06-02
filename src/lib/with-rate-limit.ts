/**
 * API route 共用 rate-limit wrapper — 單一入口
 *
 * 搭配既有 src/lib/rate-limit.ts 的 in-memory 計數器。
 * route 端早退用法：
 *
 *   import { enforceRateLimit, clientIp } from "@/lib/with-rate-limit";
 *
 *   export async function POST(req: NextRequest) {
 *     const limited = enforceRateLimit({ key: `login:${clientIp(req)}`, limit: 5, windowMs: 15 * 60_000 });
 *     if (limited) return limited;          // 429 已包好（含 Retry-After / RateLimit-* headers）
 *     // ...繼續
 *   }
 *
 * ⚠️ in-memory 只在單一 instance 有效（見 rate-limit.ts 註解）。
 *    Zeabur scale 到多 instance 時，把 rateLimit() 換成 Upstash Redis 版即可，
 *    這個 wrapper 介面不用動。
 */

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export interface EnforceOptions {
  /** 識別 key，建議帶前綴避免不同端點互撞，如 `v1chat:${userId}`、`login:${ip}` */
  key: string;
  /** 視窗內最大次數 */
  limit: number;
  /** 視窗長度（毫秒） */
  windowMs: number;
}

/**
 * 取 client IP — 依 Zeabur / Cloudflare / 標準 proxy header 順序。
 * 注意：header 可被偽造，僅用於 rate-limit 粗分流，不可當身份依據。
 */
export function clientIp(req: NextRequest): string {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||                       // Cloudflare
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for")?.split(",")[0].trim()) ||
    "unknown"
  );
}

/**
 * 檢查並計數。超限回 429（含標準 headers）、未超限回 null（放行）。
 */
export function enforceRateLimit(opts: EnforceOptions): NextResponse | null {
  const r = rateLimit(opts.key, opts.limit, opts.windowMs);

  const headers: Record<string, string> = {
    "RateLimit-Limit": String(opts.limit),
    "RateLimit-Remaining": String(Math.max(0, r.remaining)),
    "RateLimit-Reset": String(Math.ceil(r.resetAt / 1000)),
  };

  if (!r.ok) {
    const retryAfter = r.retryAfter ?? Math.ceil((r.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: "too_many_requests", retry_after: retryAfter },
      { status: 429, headers: { ...headers, "Retry-After": String(Math.max(1, retryAfter)) } },
    );
  }

  return null;
}
