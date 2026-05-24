/**
 * 個人 LINE 通知（給綁定了 LINE 的 user 推他自己的 LINE）
 *
 * 跟 notify-admin.ts 不同：
 * - notifyAdmin: 推給「平台運營者」(LINE userId 從 env / DB ADMIN_LINE_USERS)
 * - notifyUserLine: 推給「特定 user 自己」(LINE userId 從 profiles.line_user_id)
 *
 * 使用相同 ADMIN_LINE_CHANNEL_TOKEN（同一個 bot）、user 必須先加 bot 為好友
 * 並透過 /settings 綁定流程拿到 line_user_id。
 */

import { createSupabaseAdmin } from "./supabase-admin";

const ENDPOINT = "https://api.line.me/v2/bot";

export type UserLineNotify = {
  userId: string;     // AI 島 user uuid（profiles.id）
  text: string;       // fallback 純文字（給 push)
  flex?: any;         // 可選 LINE Flex Message
};

export async function notifyUserLine(opts: UserLineNotify): Promise<{ ok: boolean; reason?: string }> {
  // 優先用 USER bot（給 user 加好友的）、沒設就 fallback admin bot（兩個都沒設才放棄）
  const token = process.env.USER_LINE_CHANNEL_TOKEN || process.env.ADMIN_LINE_CHANNEL_TOKEN;
  if (!token) return { ok: false, reason: "no_channel_token" };

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("line_user_id, line_notify_enabled")
    .eq("id", opts.userId)
    .maybeSingle();

  if (!profile) return { ok: false, reason: "user_not_found" };
  if (!(profile as any).line_user_id) return { ok: false, reason: "not_bound" };
  if ((profile as any).line_notify_enabled === false) return { ok: false, reason: "user_disabled" };

  const lineUserId = (profile as any).line_user_id as string;

  const message = opts.flex
    ? opts.flex
    : { type: "text", text: opts.text.slice(0, 4900) };

  try {
    const res = await fetch(`${ENDPOINT}/message/push`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: lineUserId, messages: [message] }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return { ok: false, reason: `line_${res.status}_${err.slice(0, 80)}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? "fetch_failed" };
  }
}

/** 產生 6 位 bind code、5 分鐘有效、寫入 profiles.line_bind_code */
export async function generateBindCode(userId: string): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
  const admin = createSupabaseAdmin();
  await admin
    .from("profiles")
    .update({
      line_bind_code: code,
      line_bind_code_expires_at: expiresAt,
    })
    .eq("id", userId);
  return code;
}

/** 用 bind code 查 user、把 LINE userId 綁過去 */
export async function consumeBindCode(
  code: string,
  lineUserId: string,
): Promise<{ ok: boolean; userId?: string; reason?: string }> {
  if (!/^\d{6}$/.test(code)) return { ok: false, reason: "invalid_format" };

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, username, line_bind_code, line_bind_code_expires_at")
    .eq("line_bind_code", code)
    .maybeSingle();

  if (!profile) return { ok: false, reason: "code_not_found" };
  if (!(profile as any).line_bind_code_expires_at) return { ok: false, reason: "no_expiry" };
  if (new Date((profile as any).line_bind_code_expires_at) < new Date()) {
    return { ok: false, reason: "code_expired" };
  }

  // 確認 line_user_id 沒被別人綁
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("line_user_id", lineUserId)
    .neq("id", (profile as any).id)
    .maybeSingle();
  if (existing) return { ok: false, reason: "line_already_bound_to_another" };

  await admin
    .from("profiles")
    .update({
      line_user_id: lineUserId,
      line_bound_at: new Date().toISOString(),
      line_bind_code: null,
      line_bind_code_expires_at: null,
      line_notify_enabled: true,
    })
    .eq("id", (profile as any).id);

  return { ok: true, userId: (profile as any).id };
}
