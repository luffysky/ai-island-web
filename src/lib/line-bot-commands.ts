/**
 * LINE bot 命令系統
 * 林董手機 LINE 直接 /today /kpi 7 /users /churn /errors /help
 */
import { createSupabaseAdmin } from "./supabase-admin";
import { type AdminLineUser } from "./admin-line-users";
import { buildKpiCard, buildListCard, buildSimpleCard, type FlexMessage } from "./line-flex";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";
const ADMIN_SLUG = process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2";

export function isCommand(text: string): boolean {
  return text.trim().startsWith("/");
}

export type BotReply = { text: string; flex?: FlexMessage };

export async function runBotCommand(text: string, user: AdminLineUser): Promise<BotReply> {
  const parts = text.trim().split(/\s+/);
  const cmd = parts[0].slice(1).toLowerCase(); // 去掉 /
  const args = parts.slice(1);

  try {
    switch (cmd) {
      case "help": return cmdHelp();
      case "today": return await cmdToday();
      case "kpi": return await cmdKpi(args);
      case "users": return await cmdUsers(args);
      case "churn": return await cmdChurn();
      case "errors": return await cmdErrors();
      case "who": return cmdWho(user);
      case "prefs": {
        const { runPostback } = await import("./line-postback");
        return await runPostback("action=prefs_list", user);
      }
      case "online":    return await cmdOnline();
      case "sub":       return await cmdSub();
      case "orders":    return await cmdOrders(args);
      case "ai-cost":   return await cmdAiCost(args);
      case "ai_cost":   return await cmdAiCost(args);
      case "notify":    return await cmdNotify(args.join(" "));
      case "maint":     return await cmdMaint(args[0]);
      case "leetcode":  return await cmdLeetcode(args[0]);
      case "island":    return await cmdIsland();
      case "quiz":      return await cmdQuizStats();
      case "refund":    return await cmdRefund(args[0]);
      case "feature":   return await cmdFeature(args[0], args[1]);
      case "email":     return await cmdEmail(args[0], args.slice(1).join(" "));
      case "grant":     return await cmdGrantPrompt(args[0], Number(args[1] ?? 0));
      default: return { text: `❓ 未知命令 /${cmd}、輸入 /help 看清單` };
    }
  } catch (e: any) {
    return { text: `❌ 命令失敗：${e?.message ?? "未知錯誤"}` };
  }
}

function cmdHelp(): BotReply {
  const body =
    "📊 報表類\n" +
    "/today · 今日 KPI\n" +
    "/kpi 7 · N 天 KPI\n" +
    "/online · 線上人數\n" +
    "/sub · 訂閱概覽\n" +
    "/orders [N] · 最近訂單\n" +
    "/ai-cost [天數] · AI 用量\n" +
    "/quiz · 今日測驗\n" +
    "/island · 島嶼統計\n\n" +
    "👤 用戶\n" +
    "/users · 最近註冊\n" +
    "/churn · 流失預警\n" +
    "/leetcode [user] · leetcode 進度\n\n" +
    "⚙️ 動作\n" +
    "/notify [訊息] · 全站廣播\n" +
    "/maint on|off · 維護模式\n" +
    "/feature key on|off · feature flag\n" +
    "/email [user] [內容]\n" +
    "/refund [order_id]\n" +
    "/grant [user] [amount]（雙重確認）\n" +
    "/ban [user] · 封禁\n\n" +
    "🛠️ 系統\n" +
    "/errors · 系統錯誤\n" +
    "/prefs · 通知偏好\n" +
    "/who · 我的身份\n" +
    "/clear · 清對話歷史\n\n" +
    "其他訊息 → AI 對話";
  return {
    text: body,
    flex: buildSimpleCard({
      emoji: "📖",
      title: "命令清單",
      accentColor: "#8be9fd",
      body,
    }),
  };
}

function cmdWho(user: AdminLineUser): BotReply {
  return { text: `🪪 ${user.name}（${user.role}）\nuserId: ${user.id}`, flex: buildSimpleCard({
    emoji: "🪪",
    title: "你的身份",
    accentColor: "#ffd700",
    meta: [
      { label: "名稱", value: user.name },
      { label: "角色", value: user.role },
      { label: "userId", value: user.id },
    ],
  })};
}

async function cmdToday(): Promise<BotReply> {
  return await cmdKpi(["1"], "今日");
}

async function cmdKpi(args: string[], label?: string): Promise<BotReply> {
  const days = Math.max(1, Math.min(365, parseInt(args[0] ?? "7", 10) || 7));
  const tag = label ?? `${days} 天`;
  const admin = createSupabaseAdmin();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const day1 = new Date(Date.now() - 86400_000).toISOString();

  const [{ count: signups }, { count: dau }, { count: subs }, { data: lessons }, { data: orders }] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", since),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_at", day1).is("banned_at", null),
    admin.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    admin.from("lesson_progress").select("user_id").gte("completed_at", since).limit(50000),
    admin.from("orders").select("amount_twd").eq("status", "paid").gte("created_at", since),
  ] as any);

  const revenue = ((orders as any[]) ?? []).reduce((s, o: any) => s + Number(o.amount_twd ?? 0), 0);
  const lessonCount = (lessons as any[])?.length ?? 0;
  const activeUsers = new Set(((lessons as any[]) ?? []).map((l: any) => l.user_id)).size;

  const text = [
    `📊 ${tag} KPI`,
    `👤 新註冊：${signups ?? 0}`,
    `🟢 DAU（昨日）：${dau ?? 0}`,
    `💎 活躍訂閱：${subs ?? 0}`,
    `📚 完成 lesson：${lessonCount} 次 / ${activeUsers} 人`,
    `💰 期間收入：NT$ ${revenue.toLocaleString()}`,
  ].join("\n");
  return { text, flex: buildKpiCard({
    title: `${tag} KPI`,
    rows: [
      { icon: "👤", label: "新註冊", value: String(signups ?? 0) },
      { icon: "🟢", label: "DAU", value: String(dau ?? 0) },
      { icon: "💎", label: "活躍訂閱", value: String(subs ?? 0) },
      { icon: "📚", label: "完成 lesson", value: `${lessonCount} 次` },
      { icon: "👥", label: "活躍學員", value: `${activeUsers} 人` },
      { icon: "💰", label: "收入", value: `NT$ ${revenue.toLocaleString()}` },
    ],
  })};
}

async function cmdUsers(args: string[]): Promise<BotReply> {
  const n = Math.max(1, Math.min(50, parseInt(args[0] ?? "10", 10) || 10));
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("profiles")
    .select("username, display_name, created_at, level, xp")
    .order("created_at", { ascending: false })
    .limit(n);
  if (!data || data.length === 0) return { text: "🌱 還沒有用戶" };
  const lines = (data as any[]).map((u, i) =>
    `${i + 1}. ${u.display_name || u.username} · Lv${u.level ?? 1} · ${u.xp ?? 0} XP · ${new Date(u.created_at).toLocaleDateString("zh-TW")}`
  );
  return { text: `👥 最近 ${n} 位註冊\n` + lines.join("\n"), flex: buildListCard({
    title: `最近 ${n} 位註冊`,
    emoji: "👥",
    items: (data as any[]).map((u) => ({
      primary: `${u.display_name || u.username}`,
      secondary: `Lv${u.level ?? 1} · ${u.xp ?? 0} XP · ${new Date(u.created_at).toLocaleDateString("zh-TW")}`,
    })),
    footerButton: { label: "打開後台", uri: `${SITE_URL}/${ADMIN_SLUG}/admin/users` },
  })};
}

async function cmdChurn(): Promise<BotReply> {
  const admin = createSupabaseAdmin();
  // 簡單版：xp >= 100 且 last_active_at >= 14 天前
  const cutoff = new Date(Date.now() - 14 * 86400_000).toISOString();
  const { data } = await admin
    .from("profiles")
    .select("username, display_name, xp, level, last_active_at")
    .gte("xp", 100)
    .or(`last_active_at.lt.${cutoff},last_active_at.is.null`)
    .is("banned_at", null)
    .order("xp", { ascending: false })
    .limit(10);
  if (!data || data.length === 0) return { text: "✅ 沒有高風險流失用戶" };
  const items = (data as any[]).map((u) => {
    const days = u.last_active_at ? Math.floor((Date.now() - new Date(u.last_active_at).getTime()) / 86400_000) : "?";
    return { primary: u.display_name || u.username, secondary: `Lv${u.level} · ${u.xp} XP · 離開 ${days} 天` };
  });
  const lines = items.map((x, i) => `${i + 1}. ${x.primary} · ${x.secondary}`);
  return { text: `🚨 流失 Top 10（XP≥100、14 天未回）\n` + lines.join("\n"), flex: buildListCard({
    title: "流失預警 Top 10",
    emoji: "🚨",
    items,
    footerButton: { label: "看 churn 後台", uri: `${SITE_URL}/${ADMIN_SLUG}/admin/churn` },
  })};
}

async function cmdErrors(): Promise<BotReply> {
  const admin = createSupabaseAdmin();
  try {
    const { data } = await admin
      .from("error_log")
      .select("level, message, path, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (!data || data.length === 0) return { text: "✅ 最近沒有錯誤" };
    const items = (data as any[]).map((e) => {
      const t = new Date(e.created_at).toLocaleString("zh-TW", { hour12: false });
      return { primary: `[${e.level}] ${e.message?.slice(0, 60)}`, secondary: `${e.path ?? ""} · ${t}` };
    });
    const lines = items.map((x, i) => `${i + 1}. ${x.primary}\n   ${x.secondary}`);
    return { text: `🛡️ 最近 10 個錯誤\n` + lines.join("\n"), flex: buildListCard({
      title: "最近 10 個錯誤",
      emoji: "🛡️",
      items,
      footerButton: { label: "看 errors 後台", uri: `${SITE_URL}/${ADMIN_SLUG}/admin/errors` },
    })};
  } catch {
    return { text: "⚠️ error_log 表還沒建（要跑 error_log_migration.sql）" };
  }
}

// ============ 批 29 新增 13 命令 ============

async function cmdOnline(): Promise<BotReply> {
  const admin = createSupabaseAdmin();
  const since = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data, count } = await admin
    .from("profiles")
    .select("username, display_name, last_active_at, role", { count: "exact" })
    .gte("last_active_at", since)
    .is("banned_at", null)
    .order("last_active_at", { ascending: false })
    .limit(20);
  const items = ((data as any[]) ?? []).map((u) => ({
    primary: u.display_name || u.username,
    secondary: `${u.role === "admin" ? "👑 " : ""}${Math.round((Date.now() - new Date(u.last_active_at).getTime()) / 1000)} 秒前`,
  }));
  if (items.length === 0) return { text: "🌙 目前沒人在線（過去 5 分鐘）" };
  return {
    text: `🟢 線上 ${count ?? 0} 人\n` + items.map((x, i) => `${i + 1}. ${x.primary} · ${x.secondary}`).join("\n"),
    flex: buildListCard({ title: `🟢 線上 ${count ?? 0} 人（5 分內）`, emoji: "🟢", items }),
  };
}

async function cmdSub(): Promise<BotReply> {
  const admin = createSupabaseAdmin();
  const monthStart = new Date();
  monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const [active, trial, cancelled, monthNew] = await Promise.all([
    admin.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    admin.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "trial"),
    admin.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "cancelled"),
    admin.from("subscriptions").select("*", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
  ] as any);
  return {
    text: `💎 訂閱：active ${active.count ?? 0} · trial ${trial.count ?? 0} · cancelled ${cancelled.count ?? 0} · 本月新增 ${monthNew.count ?? 0}`,
    flex: { type: "flex", altText: "訂閱概覽", contents: (await import("./line-flex")).buildKpiCard({
      title: "💎 訂閱概覽",
      rows: [
        { icon: "🟢", label: "Active", value: String(active.count ?? 0) },
        { icon: "🆓", label: "Trial", value: String(trial.count ?? 0) },
        { icon: "🔴", label: "Cancelled", value: String(cancelled.count ?? 0) },
        { icon: "✨", label: "本月新增", value: String(monthNew.count ?? 0) },
      ],
    }).contents } as any,
  };
}

async function cmdOrders(args: string[]): Promise<BotReply> {
  const n = Math.max(1, Math.min(50, parseInt(args[0] ?? "10", 10) || 10));
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("orders")
    .select("id, amount_twd, status, plan_label, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(n);
  if (!data || data.length === 0) return { text: "📭 沒有訂單" };
  const items = (data as any[]).map((o) => ({
    primary: `NT$${o.amount_twd?.toLocaleString?.() ?? o.amount_twd} · ${o.status}`,
    secondary: `${o.plan_label ?? ""} · ${new Date(o.created_at).toLocaleString("zh-TW", { hour12: false })}`,
  }));
  return {
    text: `💰 最近 ${n} 筆訂單\n` + items.map((x, i) => `${i + 1}. ${x.primary} · ${x.secondary}`).join("\n"),
    flex: buildListCard({ title: `💰 最近 ${n} 筆訂單`, emoji: "💰", items, footerButton: { label: "看訂單後台", uri: `${SITE_URL}/${ADMIN_SLUG}/admin/orders` } }),
  };
}

async function cmdAiCost(args: string[]): Promise<BotReply> {
  const days = Math.max(1, Math.min(90, parseInt(args[0] ?? "7", 10) || 7));
  const admin = createSupabaseAdmin();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  // ai_usage_logs（若存在）— 用 try / fallback
  try {
    const { data } = await admin
      .from("ai_usage_logs")
      .select("tokens_input, tokens_output, model_name, provider")
      .gte("created_at", since)
      .limit(50000);
    if (!data || data.length === 0) return { text: `💸 近 ${days} 天無 AI 用量紀錄` };
    let inTok = 0, outTok = 0;
    const byModel: Record<string, { in: number; out: number }> = {};
    for (const r of data as any[]) {
      inTok += r.tokens_input ?? 0;
      outTok += r.tokens_output ?? 0;
      const k = r.model_name ?? "unknown";
      byModel[k] ??= { in: 0, out: 0 };
      byModel[k].in += r.tokens_input ?? 0;
      byModel[k].out += r.tokens_output ?? 0;
    }
    // 粗估成本（Anthropic claude-3.5-sonnet $3/MTok in、$15/MTok out 平均）
    const estUsd = (inTok * 3 + outTok * 15) / 1_000_000;
    const top = Object.entries(byModel).sort((a, b) => (b[1].in + b[1].out) - (a[1].in + a[1].out)).slice(0, 5);
    return {
      text: `💸 ${days} 天 AI 用量：${(inTok / 1000).toFixed(1)}K in / ${(outTok / 1000).toFixed(1)}K out · 估 $${estUsd.toFixed(2)}`,
      flex: buildListCard({
        title: `💸 AI ${days} 天用量`,
        emoji: "🤖",
        items: [
          { primary: `總計 $${estUsd.toFixed(2)}`, secondary: `${(inTok / 1000).toFixed(1)}K in / ${(outTok / 1000).toFixed(1)}K out` },
          ...top.map(([model, v]) => ({ primary: model, secondary: `${(v.in / 1000).toFixed(1)}K in / ${(v.out / 1000).toFixed(1)}K out` })),
        ],
        footerButton: { label: "AI 用量後台", uri: `${SITE_URL}/${ADMIN_SLUG}/admin/ai/usage` },
      }),
    };
  } catch {
    return { text: "⚠️ ai_usage_logs 表還沒建" };
  }
}

async function cmdNotify(msg: string): Promise<BotReply> {
  const text = msg.trim();
  if (!text || text.length < 2) return { text: "用法：/notify 訊息內容（會發給所有用戶）" };
  const admin = createSupabaseAdmin();
  const { data: users } = await admin.from("profiles").select("id").is("banned_at", null);
  const ids = ((users as any[]) ?? []).map((u: any) => u.id);
  if (ids.length === 0) return { text: "❌ 沒有用戶" };
  const rows = ids.map((id) => ({ user_id: id, kind: "system", title: "📣 系統公告", body: text.slice(0, 500) }));
  // 批次 insert（一次 1000）
  for (let i = 0; i < rows.length; i += 1000) {
    await admin.from("notifications").insert(rows.slice(i, i + 1000));
  }
  return { text: `📣 已發給 ${ids.length} 個用戶`, flex: buildSimpleCard({
    emoji: "📣", title: "系統公告已發送", accentColor: "#ffd700",
    meta: [{ label: "👥 收件人", value: `${ids.length} 人` }, { label: "📝 訊息", value: text.slice(0, 200) }],
  })};
}

async function cmdMaint(arg?: string): Promise<BotReply> {
  if (arg !== "on" && arg !== "off") return { text: "用法：/maint on 或 /maint off" };
  const admin = createSupabaseAdmin();
  const enabled = arg === "on";
  try {
    await admin.from("system_settings").upsert({ key: "maintenance_mode", value: { enabled, at: new Date().toISOString() } });
  } catch {
    try { await admin.from("feature_flags").upsert({ key: "maintenance_mode", enabled }); } catch {}
  }
  return { text: `🚧 維護模式已 ${enabled ? "開啟" : "關閉"}`, flex: buildSimpleCard({
    emoji: enabled ? "🚧" : "✅", title: `維護模式 ${enabled ? "ON" : "OFF"}`,
    accentColor: enabled ? "#ff5555" : "#50fa7b",
  })};
}

async function cmdLeetcode(username?: string): Promise<BotReply> {
  if (!username) return { text: "用法：/leetcode [username 或 user uuid]" };
  const admin = createSupabaseAdmin();
  // 先 by username、否則 by id
  let q = admin.from("profiles").select("username, display_name, leetcode_username, leetcode_stats");
  q = q.eq("username", username);
  const { data } = await q.maybeSingle();
  if (!data) return { text: `❌ 找不到用戶 ${username}` };
  const p = data as any;
  if (!p.leetcode_username) return { text: `${p.display_name || p.username} 還沒綁 leetcode` };
  const s = p.leetcode_stats;
  if (!s) return { text: `${p.display_name || p.username} 綁定 ${p.leetcode_username}、但尚無 stats` };
  return {
    text: `💻 @${p.leetcode_username}：${s.totalSolved}/${s.totalQuestions} · E${s.easySolved} M${s.mediumSolved} H${s.hardSolved}`,
    flex: buildSimpleCard({
      emoji: "💻", title: `Leetcode @${p.leetcode_username}`,
      meta: [
        { label: "總解", value: `${s.totalSolved} / ${s.totalQuestions}` },
        { label: "Easy", value: `${s.easySolved} / ${s.easyTotal}` },
        { label: "Medium", value: `${s.mediumSolved} / ${s.mediumTotal}` },
        { label: "Hard", value: `${s.hardSolved} / ${s.hardTotal}` },
        { label: "通過率", value: `${s.acceptanceRate}%` },
        { label: "Rank", value: `#${s.ranking?.toLocaleString?.()}` },
      ],
      buttons: [{ label: "看 leetcode", uri: `https://leetcode.com/${p.leetcode_username}/` }],
    }),
  };
}

async function cmdIsland(): Promise<BotReply> {
  const admin = createSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);
  // 從 zcoin_ledger 抓今日 island_* reason
  try {
    const { data } = await admin
      .from("zcoin_ledger")
      .select("reason, amount")
      .gte("created_at", new Date(today).toISOString())
      .like("reason", "island_%")
      .limit(5000);
    if (!data || data.length === 0) return { text: "🏝️ 今天島嶼還沒人玩" };
    const groups: Record<string, { count: number; sum: number }> = {};
    for (const r of data as any[]) {
      const kind = (r.reason as string).split(":")[0]; // island_chest / island_fish / island_quest
      groups[kind] ??= { count: 0, sum: 0 };
      groups[kind].count++;
      groups[kind].sum += Number(r.amount ?? 0);
    }
    const items = Object.entries(groups).map(([k, v]) => ({
      primary: k.replace("island_", "🏝️ "), secondary: `${v.count} 次 · 共發 ${v.sum} z 幣`,
    }));
    return {
      text: `🏝️ 今日島嶼\n` + items.map((x) => `${x.primary}：${x.secondary}`).join("\n"),
      flex: buildListCard({ title: "🏝️ 今日島嶼", emoji: "🏝️", items }),
    };
  } catch {
    return { text: "❌ 抓不到島嶼統計" };
  }
}

async function cmdQuizStats(): Promise<BotReply> {
  const admin = createSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from("daily_quiz_attempts")
    .select("user_id, correct, total, pass")
    .eq("quiz_date", today)
    .limit(5000);
  const arr = (data as any[]) ?? [];
  if (arr.length === 0) return { text: "🧠 今天還沒人做測驗" };
  const submitted = arr.filter((a) => a.total > 0).length;
  const passes = arr.filter((a) => a.pass).length;
  const avgPct = submitted > 0 ? (arr.reduce((s, a) => s + (a.total > 0 ? a.correct / a.total : 0), 0) / submitted * 100).toFixed(1) : "—";
  return {
    text: `🧠 今日測驗：${submitted} 人做、通過 ${passes} · 平均正確率 ${avgPct}%`,
    flex: buildSimpleCard({
      emoji: "🧠", title: "今日測驗統計", accentColor: "#bd93f9",
      meta: [
        { label: "完成人數", value: String(submitted) },
        { label: "通過人數", value: String(passes) },
        { label: "平均正確率", value: `${avgPct}%` },
      ],
    }),
  };
}

async function cmdRefund(orderId?: string): Promise<BotReply> {
  if (!orderId) return { text: "用法：/refund [order_id]" };
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("orders").update({ status: "refunded", refunded_at: new Date().toISOString() }).eq("id", orderId);
  if (error) return { text: `❌ 退款失敗：${error.message}` };
  return { text: `💸 訂單 ${orderId.slice(0, 8)} 已標記退款`, flex: buildSimpleCard({
    emoji: "💸", title: "退款已處理", accentColor: "#ff79c6",
    meta: [{ label: "訂單 ID", value: orderId }],
  })};
}

async function cmdFeature(key?: string, value?: string): Promise<BotReply> {
  if (!key) return { text: "用法：/feature [key] on|off" };
  const enabled = value === "on";
  const admin = createSupabaseAdmin();
  try {
    await admin.from("feature_flags").upsert({ key, enabled, updated_at: new Date().toISOString() });
  } catch {
    return { text: "❌ feature_flags 表未建" };
  }
  return { text: `🎚️ Feature [${key}] 已 ${enabled ? "ON" : "OFF"}` };
}

async function cmdEmail(usernameOrId?: string, body?: string): Promise<BotReply> {
  if (!usernameOrId || !body) return { text: "用法：/email [user] [內容]" };
  const admin = createSupabaseAdmin();
  let userId = usernameOrId;
  if (!usernameOrId.includes("-")) {
    const { data } = await admin.from("profiles").select("id").eq("username", usernameOrId).maybeSingle();
    if (!data) return { text: `❌ 找不到 ${usernameOrId}` };
    userId = (data as any).id;
  }
  // 寫進 notifications + 寄 email（如果 email helper 存在）
  await admin.from("notifications").insert({ user_id: userId, kind: "system", title: "📩 來自管理員", body: body.slice(0, 500) });
  return { text: `📩 已寄給 ${usernameOrId}（in-app 通知）` };
}

async function cmdGrantPrompt(usernameOrId?: string, amount?: number): Promise<BotReply> {
  if (!usernameOrId || !amount || amount <= 0) return { text: "用法：/grant [user] [amount]" };
  const admin = createSupabaseAdmin();
  let userId = usernameOrId;
  let name = usernameOrId;
  if (!usernameOrId.includes("-")) {
    const { data } = await admin.from("profiles").select("id, display_name, username").eq("username", usernameOrId).maybeSingle();
    if (!data) return { text: `❌ 找不到 ${usernameOrId}` };
    userId = (data as any).id;
    name = (data as any).display_name || (data as any).username || userId;
  }
  // 大金額（>= 500）需要雙重確認、用 postback button
  if (amount >= 500) {
    return {
      text: `⚠️ 確認補 ${amount} z 幣給 ${name}？`,
      flex: buildSimpleCard({
        emoji: "⚠️", title: "確認補 z 幣？",
        accentColor: "#ff5555",
        body: `要補 ${amount} z 幣給 ${name}。\n（${amount >= 500 ? "金額較大、請確認" : ""}）`,
        meta: [
          { label: "👤 對象", value: name },
          { label: "🪙 金額", value: `${amount} z 幣` },
        ],
        buttons: [
          { label: "✅ 確認", postback: `action=grant_coin&user_id=${userId}&amount=${amount}`, primary: true, displayText: `確認補 ${amount} z 幣` },
          { label: "❌ 取消", postback: `action=cancel`, displayText: "取消" },
        ],
      }),
    };
  }
  // 小金額直接執行
  const { runPostback } = await import("./line-postback");
  return await runPostback(`action=grant_coin&user_id=${userId}&amount=${amount}`, { id: "", name: "", role: "" } as any);
}
