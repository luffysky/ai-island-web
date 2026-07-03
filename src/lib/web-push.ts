/**
 * Web Push 送信 helper。
 *
 * - VAPID 環境變數（NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT）
 *   未設 → 全部 no-op（graceful、不 throw）。
 * - 送信對象：某 user 的所有 push_subscriptions（跨裝置）。
 * - 死掉的訂閱（410 Gone / 404）自動從 DB 剪除。
 * - fire-and-forget 安全：任何錯誤都吞掉、不會 throw 阻擋呼叫端。
 *
 * web-push 套件用 dynamic import：整合時安裝即可、未安裝時（連同 VAPID 未設）也不會 crash。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  icon?: string;
};

// 用 any 避免相依 @types/web-push 是否安裝（整合時只裝 web-push 也不會 typecheck 爆）
type WebPushModule = any;

let cachedWebPush: WebPushModule | null | undefined; // undefined=未載, null=不可用

function vapidConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY,
  );
}

/** 載入並設定 web-push（僅在 VAPID 齊全時）。失敗回 null。 */
async function getWebPush(): Promise<WebPushModule | null> {
  if (cachedWebPush !== undefined) return cachedWebPush;
  if (!vapidConfigured()) {
    cachedWebPush = null;
    return null;
  }
  try {
    // 間接 specifier：TS 不靜態解析、避免 @types/web-push 未裝時 typecheck 報錯
    const spec = "web-push";
    const mod: any = await import(spec);
    const webpush: WebPushModule = mod.default ?? mod;
    const subject = process.env.VAPID_SUBJECT || "mailto:admin@snowrealm.pet";
    webpush.setVapidDetails(
      subject,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
    cachedWebPush = webpush;
    return webpush;
  } catch (e) {
    console.warn("[web-push] 套件載入/設定失敗、push 停用:", (e as any)?.message);
    cachedWebPush = null;
    return null;
  }
}

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string };

/** 送一則 push 給指定 subscription。回 { ok, dead }（dead=該訂閱已失效需剪除）。 */
async function sendToOne(
  webpush: WebPushModule,
  sub: SubRow,
  payload: string,
): Promise<{ ok: boolean; dead: boolean }> {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      payload,
    );
    return { ok: true, dead: false };
  } catch (e: any) {
    const status = e?.statusCode;
    // 410 Gone / 404 Not Found → 訂閱死了、剪除
    if (status === 410 || status === 404) return { ok: false, dead: true };
    console.warn("[web-push] send fail:", status, e?.body || e?.message);
    return { ok: false, dead: false };
  }
}

/**
 * 送 push 給某 user 的所有裝置。fire-and-forget 安全（不 throw）。
 * VAPID 未設 / 無訂閱 → no-op。
 * 回傳送達數（best-effort、可忽略）。
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<number> {
  try {
    if (!userId) return 0;
    const webpush = await getWebPush();
    if (!webpush) return 0; // VAPID 未設或套件不可用 → no-op

    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId)
      .limit(50);
    const subs = (data as SubRow[] | null) ?? [];
    if (subs.length === 0) return 0;

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body ?? "",
      url: payload.url ?? "/",
      tag: payload.tag ?? "ai-island",
      icon: payload.icon ?? "/favicon.svg",
    });

    const results = await Promise.all(
      subs.map((s) => sendToOne(webpush, s, body)),
    );

    // 剪除死訂閱
    const deadIds = subs.filter((_, i) => results[i].dead).map((s) => s.id);
    if (deadIds.length > 0) {
      await admin
        .from("push_subscriptions")
        .delete()
        .in("id", deadIds)
        .then(() => {}, () => {});
    }

    return results.filter((r) => r.ok).length;
  } catch (e: any) {
    // fire-and-forget：吞掉一切、不影響呼叫端
    console.warn("[web-push] sendPushToUser error:", e?.message);
    return 0;
  }
}

/** VAPID 是否已設定（給 API/UI 判斷用）。 */
export function isPushEnabled(): boolean {
  return vapidConfigured();
}
