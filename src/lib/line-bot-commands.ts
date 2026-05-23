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
      default: return { text: `❓ 未知命令 /${cmd}、輸入 /help 看清單` };
    }
  } catch (e: any) {
    return { text: `❌ 命令失敗：${e?.message ?? "未知錯誤"}` };
  }
}

function cmdHelp(): BotReply {
  const text = [
    "📖 可用命令：",
    "/today — 今日 KPI（DAU、新註冊、完課、收入）",
    "/kpi [天數] — N 天 KPI（預設 7、可 30 / 90）",
    "/users — 最近 10 位註冊用戶",
    "/churn — 高風險流失 Top 10",
    "/errors — 最近 10 個系統錯誤",
    "/who — 顯示我認到你的身份",
    "/clear — 清空我們對話歷史",
    "其他直接輸入 → AI 對話",
  ].join("\n");
  return { text, flex: buildSimpleCard({
    emoji: "📖",
    title: "可用命令",
    accentColor: "#8be9fd",
    body: "/today  · 今日 KPI\n/kpi 7  · N 天 KPI\n/users  · 最近註冊\n/churn  · 流失預警\n/errors · 系統錯誤\n/who    · 我的身份\n/clear  · 清對話\n\n其他訊息 → AI 對話",
  })};
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
