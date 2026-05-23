/**
 * LINE PostBack actions
 * 用戶按 Flex 卡片或 Rich Menu 按鈕、LINE 送 postback event 到 webhook
 * data 格式：action=xxx&param1=yyy&param2=zzz
 */
import { type AdminLineUser } from "./admin-line-users";
import { setUserPref, ALL_KINDS, kindLabel } from "./admin-line-prefs";
import { buildQuickReply, buildSimpleCard, type FlexMessage, type QuickReplyAction } from "./line-flex";
import { createSupabaseAdmin } from "./supabase-admin";

export type PostbackReply = { text: string; flex?: FlexMessage };

function parseData(data: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of data.split("&")) {
    const [k, v] = part.split("=");
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  }
  return out;
}

export async function runPostback(data: string, user: AdminLineUser): Promise<PostbackReply> {
  const p = parseData(data);
  const action = p.action ?? "";
  try {
    switch (action) {
      case "prefs_toggle": return await actPrefsToggle(user.id, p.kind);
      case "prefs_list":   return await actPrefsList(user.id);
      case "ban_user":     return await actBanUser(p.user_id);
      case "grant_coin":   return await actGrantCoin(p.user_id, Number(p.amount ?? 50));
      case "ack_error":    return actAckError(p.id);
      case "menu_today":   return { text: "/today（用 /today 命令拿即時報表）" };
      default: return { text: `❓ 未知 postback action：${action}` };
    }
  } catch (e: any) {
    return { text: `❌ postback 失敗：${e?.message ?? "未知"}` };
  }
}

async function actPrefsToggle(lineUserId: string, kind: string): Promise<PostbackReply> {
  if (!kind || !ALL_KINDS.includes(kind as any)) return { text: `❌ 無效 kind: ${kind}` };
  const { getUserPrefs } = await import("./admin-line-prefs");
  const cur = await getUserPrefs(lineUserId);
  const next = !cur[kind];
  await setUserPref(lineUserId, kind, next);
  return { text: `${next ? "✅ 已開" : "🔇 已關"} ${kindLabel(kind)}` };
}

async function actPrefsList(lineUserId: string): Promise<PostbackReply> {
  const { getUserPrefs } = await import("./admin-line-prefs");
  const prefs = await getUserPrefs(lineUserId);
  const items = ALL_KINDS.map((k) => `${prefs[k] ? "✅" : "🔇"} ${kindLabel(k)}`).join("\n");
  // 用 Quick Reply 列前 10 個 toggle 按鈕（LINE 上限 13）
  const qr: QuickReplyAction[] = ALL_KINDS.slice(0, 10).map((k) => ({
    type: "postback",
    label: `${prefs[k] ? "🔇" : "✅"} ${kindLabel(k).replace(/^[^\s]+\s/, "")}`,
    data: `action=prefs_toggle&kind=${k}`,
    displayText: `切換 ${kindLabel(k)}`,
  }));
  return {
    text: `📋 通知偏好\n${items}\n\n（下方按鈕切換）`,
    flex: {
      ...buildSimpleCard({
        emoji: "⚙️",
        title: "通知偏好",
        accentColor: "#8be9fd",
        body: items,
      }),
      quickReply: buildQuickReply(qr),
    },
  };
}

async function actBanUser(userId: string): Promise<PostbackReply> {
  if (!userId) return { text: "❌ 缺 user_id" };
  const admin = createSupabaseAdmin();
  await admin.from("profiles").update({ banned_at: new Date().toISOString() }).eq("id", userId);
  return { text: `🔨 已封禁 user ${userId.slice(0, 8)}` };
}

async function actGrantCoin(userId: string, amount: number): Promise<PostbackReply> {
  if (!userId) return { text: "❌ 缺 user_id" };
  const admin = createSupabaseAdmin();
  try {
    await admin.rpc("grant_zcoin", {
      p_user_id: userId,
      p_amount: amount,
      p_reason: `line_admin_grant:${new Date().toISOString().slice(0, 10)}`,
    });
  } catch {
    const { data: p } = await admin.from("profiles").select("z_coin").eq("id", userId).single();
    await admin.from("profiles").update({ z_coin: ((p as any)?.z_coin ?? 0) + amount }).eq("id", userId);
  }
  return { text: `🎁 已給 user ${userId.slice(0, 8)} +${amount} z 幣` };
}

function actAckError(_id: string): PostbackReply {
  return { text: "✅ 標記已處理（之後可寫進 error_logs.ack_at）" };
}
