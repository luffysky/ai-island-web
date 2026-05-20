/**
 * Simple in-memory rate limiter
 *
 * 注意：Memory store 只在單一 server 內有效。
 * 如果 Zeabur 有多個 instance、不同 instance 的計數獨立。
 * 想要分散式 rate limit 要用 Redis / Upstash。
 * 但對個人 project 來說 memory 已經夠用。
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// 每 10 分鐘清一次過期 buckets（避免 memory leak）
let cleanupTimer: NodeJS.Timeout | null = null;
function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) {
      if (v.resetAt < now) buckets.delete(k);
    }
  }, 10 * 60 * 1000);
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * 檢查並計數
 * @param key 識別 key（如 user.id, ip）
 * @param limit 期間內最大次數
 * @param windowMs 期間（毫秒）
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  startCleanup();
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    // 新建或重置
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

/**
 * 重置某 key 的計數（測試用）
 */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}
