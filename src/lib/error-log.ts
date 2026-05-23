/**
 * P4-10 錯誤日誌 helper
 *
 * 任何 server-side 抓到的錯誤可呼叫 logError() 寫入 error_logs 表。
 * - fail-soft：log 本身失敗不丟例外（避免錯誤 cascade）
 * - 用 admin client 寫入、不受 RLS 影響
 *
 * 用法：
 *   try { ... } catch (e) {
 *     await logError({
 *       source: 'api:/api/ai/chat',
 *       error: e,
 *       userId: user?.id,
 *       request: req,
 *       extra: { conversationId },
 *     });
 *     return NextResponse.json({ error: '...' }, { status: 500 });
 *   }
 */

import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export type LogErrorInput = {
  source: string;
  error?: unknown;
  message?: string;
  level?: LogLevel;
  userId?: string | null;
  request?: Request;
  statusCode?: number;
  extra?: Record<string, unknown>;
};

export async function logError(input: LogErrorInput): Promise<void> {
  try {
    const err = input.error;
    const message =
      input.message ??
      (err instanceof Error ? err.message : typeof err === "string" ? err : "unknown error");
    const stack = err instanceof Error ? err.stack : undefined;

    let path: string | undefined;
    let method: string | undefined;
    let userAgent: string | undefined;
    let ip: string | undefined;

    if (input.request) {
      try {
        const url = new URL(input.request.url);
        path = url.pathname + url.search;
        method = input.request.method;
        userAgent = input.request.headers.get("user-agent") ?? undefined;
        // 不存原始 IP、用前綴 hash 表示（隱私）
        const xfwd = input.request.headers.get("x-forwarded-for") ?? "";
        ip = xfwd ? hashIp(xfwd.split(",")[0].trim()) : undefined;
      } catch {
        // ignore url parse error
      }
    }

    const admin = createSupabaseAdmin();
    const lvl = input.level ?? "error";
    await admin.from("error_logs").insert({
      level: lvl,
      source: input.source,
      message: message.slice(0, 2000),
      stack: stack?.slice(0, 8000),
      user_id: input.userId ?? null,
      request_path: path,
      request_method: method,
      status_code: input.statusCode ?? null,
      user_agent: userAgent?.slice(0, 500),
      ip,
      extra: input.extra ? sanitizeExtra(input.extra) : null,
    });

    // 系統錯誤推 admin LINE（限 error / fatal、避免 spam）
    if (lvl === "error" || lvl === "fatal") {
      import("./notify-admin").then((m) =>
        m.notifyAdmin({
          kind: lvl === "fatal" ? "fatal" : "error",
          dedupeKey: `${input.source}:${message.slice(0, 60)}`,
          text: `🛡️ [${lvl}] ${input.source}\n${message.slice(0, 200)}${path ? `\nat ${path}` : ""}`,
        }),
      ).catch(() => {});
    }
  } catch (e) {
    console.error("[logError] failed to persist:", e);
  }
}

function sanitizeExtra(extra: Record<string, unknown>): Record<string, unknown> {
  // 移除明顯的敏感欄位、避免落地
  const banned = new Set(["password", "token", "secret", "api_key", "apiKey", "authorization"]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(extra)) {
    if (banned.has(k.toLowerCase())) continue;
    out[k] = v;
  }
  return out;
}

// 簡單 hash IP（前 8 個字元）— 不可逆、但能在 admin 看到「同一個 IP 多次」的模式
function hashIp(ip: string): string {
  let h = 0;
  for (let i = 0; i < ip.length; i++) {
    h = (h << 5) - h + ip.charCodeAt(i);
    h |= 0;
  }
  return "ip_" + Math.abs(h).toString(36);
}
