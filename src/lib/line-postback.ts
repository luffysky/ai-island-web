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

// 小卡 helper：跟其他 bot 回覆一致（成功綠卡 / 失敗紅卡 / 中性提示卡）
function errCard(title: string, body?: string): FlexMessage {
  return buildSimpleCard({ emoji: "❌", title, accentColor: "#ff5555", body });
}
function okCard(title: string, opts?: { body?: string; meta?: Array<{ label: string; value: string }> }): FlexMessage {
  return buildSimpleCard({ emoji: "✅", title, accentColor: "#50fa7b", body: opts?.body, meta: opts?.meta });
}

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
      case "cancel":       return {
        text: "↩️ 已取消",
        flex: buildSimpleCard({ emoji: "↩️", title: "已取消", accentColor: "#6272a4", body: "沒有執行任何動作。" }),
      };
      case "menu_today":   return {
        text: "/today（用 /today 命令拿即時報表）",
        flex: buildSimpleCard({ emoji: "📊", title: "拿今日報表", accentColor: "#8be9fd", body: "傳 /today 命令拿即時報表。", buttons: [{ label: "📊 今日", text: "/today", primary: true }] }),
      };
      default: return {
        text: `❓ 未知 postback action：${action}`,
        flex: buildSimpleCard({ emoji: "❓", title: "未知操作", accentColor: "#ffb86c", body: `action：${action}` }),
      };
    }
  } catch (e: any) {
    return { text: `❌ postback 失敗：${e?.message ?? "未知"}`, flex: errCard("操作失敗", e?.message ?? "未知") };
  }
}

async function actPrefsToggle(lineUserId: string, kind: string): Promise<PostbackReply> {
  if (!kind || !ALL_KINDS.includes(kind as any))
    return { text: `❌ 無效 kind: ${kind}`, flex: errCard("無效通知類別", `kind：${kind}`) };
  const { getUserPrefs } = await import("./admin-line-prefs");
  const cur = await getUserPrefs(lineUserId);
  const next = !cur[kind];
  await setUserPref(lineUserId, kind, next);
  return {
    text: `${next ? "✅ 已開" : "🔇 已關"} ${kindLabel(kind)}`,
    flex: buildSimpleCard({
      emoji: next ? "✅" : "🔇",
      title: next ? "通知已開啟" : "通知已關閉",
      accentColor: next ? "#50fa7b" : "#6272a4",
      meta: [{ label: "類別", value: kindLabel(kind) }],
      buttons: [{ label: "⚙️ 看全部偏好", postback: "action=prefs_list", displayText: "看通知偏好" }],
    }),
  };
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
  if (!userId) return { text: "❌ 缺 user_id", flex: errCard("缺少 user_id") };
  const admin = createSupabaseAdmin();
  await admin.from("profiles").update({ banned_at: new Date().toISOString() }).eq("id", userId);
  return {
    text: `🔨 已封禁 user ${userId.slice(0, 8)}`,
    flex: buildSimpleCard({
      emoji: "🔨",
      title: "已封禁用戶",
      accentColor: "#ff5555",
      meta: [{ label: "user", value: userId.slice(0, 8) }],
    }),
  };
}

async function actGrantCoin(userId: string, amount: number): Promise<PostbackReply> {
  if (!userId) return { text: "❌ 缺 user_id", flex: errCard("缺少 user_id") };
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
  return {
    text: `🎁 已給 user ${userId.slice(0, 8)} +${amount} z 幣`,
    flex: buildSimpleCard({
      emoji: "🎁",
      title: "已補 z 幣",
      accentColor: "#50fa7b",
      meta: [
        { label: "對象", value: userId.slice(0, 8) },
        { label: "金額", value: `+${amount} z 幣` },
      ],
    }),
  };
}

function actAckError(_id: string): PostbackReply {
  return {
    text: "✅ 標記已處理（之後可寫進 error_logs.ack_at）",
    flex: okCard("已標記已處理", { body: "之後可寫進 error_logs.ack_at。" }),
  };
}
