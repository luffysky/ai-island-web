/**
 * Site Status Snapshot — 給 LINE bot AI 對話前注入的「即時站台狀態」快照。
 *
 * 目的：admin 在 LINE 問問題時、AI 已經帶著最新指標 + 健康狀態 + 最新事件，
 * 不必每次都被 admin 反問細節。
 *
 * 設計：
 *  - 30 秒 in-memory cache（同分鐘多次問不重複打 DB）
 *  - 並行抓 12 個指標、< 500ms 完成
 *  - 輸出 markdown plain text、~600~900 tokens，給 AI 當 context 不會吃滿
 *  - 失敗 silent（個別查詢失敗 → 該行寫「—」）
 */

import { createSupabaseAdmin } from "./supabase-admin";

type Cached = { at: number; text: string };
let cached: Cached | null = null;
const TTL_MS = 30_000;

export function clearSnapshotCache(): void {
  cached = null;
}

export async function getLiveSnapshot(): Promise<string> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.text;
  const text = await build();
  cached = { at: Date.now(), text };
  return text;
}

function fmt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString();
}

function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

function safeCount(r: any): number | null {
  return typeof r?.count === "number" ? r.count : null;
}

function nowTaipei(): string {
  // 台灣時區的「現在」字串、給 AI 看時序用
  return new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false });
}

async function build(): Promise<string> {
  const admin = createSupabaseAdmin();

  // 並行抓所有指標、單一查詢失敗不影響其他
  const queries = await Promise.allSettled([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", isoAgo(86400_000)),
    admin.from("error_logs").select("*", { count: "exact", head: true }).gte("created_at", isoAgo(3600_000)),
    admin.from("error_logs").select("*", { count: "exact", head: true }).gte("created_at", isoAgo(86400_000)),
    admin.from("ai_conversations").select("*", { count: "exact", head: true }).gte("created_at", isoAgo(86400_000)),
    // 30 分鐘內活躍「已登入」session
    admin.from("analytics_sessions").select("*", { count: "exact", head: true })
      .gte("last_seen_at", isoAgo(1800_000))
      .not("user_id", "is", null),
    // 30 分鐘內「訪客」session（未登入）
    admin.from("analytics_sessions").select("*", { count: "exact", head: true })
      .gte("last_seen_at", isoAgo(1800_000))
      .is("user_id", null),
    admin.from("notifications").select("*", { count: "exact", head: true }).is("read_at", null),
    admin.from("env_change_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("user_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
    admin.from("orders")
      .select("amount, currency, status")
      .gte("created_at", isoAgo(86400_000))
      .order("created_at", { ascending: false })
      .limit(50),
    admin.from("error_logs")
      .select("level, source, message, created_at")
      .order("created_at", { ascending: false })
      .limit(3),
    admin.from("audit_logs")
      .select("action, actor_username, target_type, created_at")
      .order("created_at", { ascending: false })
      .limit(3),
    admin.from("app_settings").select("value").eq("key", "island_enabled").maybeSingle(),
    // 30 分鐘內活躍用戶名單（最近 8 人、給 AI 知道「現在誰在用」）
    admin.from("profiles")
      .select("username, display_name, level, last_active_at")
      .gte("last_active_at", isoAgo(1800_000))
      .order("last_active_at", { ascending: false })
      .limit(8),
    // 30 分鐘內訪客最新去處（看哪些頁面有人）
    admin.from("analytics_page_views")
      .select("path, country, city, last_seen_at")
      .gte("last_seen_at", isoAgo(1800_000))
      .order("last_seen_at", { ascending: false })
      .limit(8),
  ]);

  const [
    qTotalUsers,
    qNewUsers24h,
    qErrors1h,
    qErrors24h,
    qAiConvs24h,
    qActiveUserSess30m,
    qAnonSess30m,
    qUnreadNotifs,
    qPendingEnv,
    qPendingReports,
    qOpenTickets,
    qOrders24h,
    qLatestErrors,
    qLatestAudit,
    qIslandFlag,
    qActiveUsers,
    qVisitorPages,
  ] = queries;

  const totalUsers = qTotalUsers.status === "fulfilled" ? safeCount(qTotalUsers.value) : null;
  const newUsers24h = qNewUsers24h.status === "fulfilled" ? safeCount(qNewUsers24h.value) : null;
  const errors1h = qErrors1h.status === "fulfilled" ? safeCount(qErrors1h.value) : null;
  const errors24h = qErrors24h.status === "fulfilled" ? safeCount(qErrors24h.value) : null;
  const aiConvs24h = qAiConvs24h.status === "fulfilled" ? safeCount(qAiConvs24h.value) : null;
  const activeUserSess30m = qActiveUserSess30m.status === "fulfilled" ? safeCount(qActiveUserSess30m.value) : null;
  const anonSess30m = qAnonSess30m.status === "fulfilled" ? safeCount(qAnonSess30m.value) : null;
  const unreadNotifs = qUnreadNotifs.status === "fulfilled" ? safeCount(qUnreadNotifs.value) : null;
  const activeUsers: any[] = qActiveUsers.status === "fulfilled" ? qActiveUsers.value.data ?? [] : [];
  const visitorPages: any[] = qVisitorPages.status === "fulfilled" ? qVisitorPages.value.data ?? [] : [];
  const pendingEnv = qPendingEnv.status === "fulfilled" ? safeCount(qPendingEnv.value) : null;
  const pendingReports = qPendingReports.status === "fulfilled" ? safeCount(qPendingReports.value) : null;
  const openTickets = qOpenTickets.status === "fulfilled" ? safeCount(qOpenTickets.value) : null;

  const orders24h: any[] = qOrders24h.status === "fulfilled" ? qOrders24h.value.data ?? [] : [];
  const paidOrders = orders24h.filter((o) => o.status === "paid" || o.status === "completed");
  const orderRevenue = paidOrders.reduce((s, o) => s + Number(o.amount || 0), 0);
  const orderCurrency = paidOrders[0]?.currency || "NT$";

  const latestErrors: any[] = qLatestErrors.status === "fulfilled" ? qLatestErrors.value.data ?? [] : [];
  const latestAudit: any[] = qLatestAudit.status === "fulfilled" ? qLatestAudit.value.data ?? [] : [];

  const islandData: any = qIslandFlag.status === "fulfilled" ? qIslandFlag.value.data : null;
  const islandVal = islandData?.value;
  const islandState =
    islandVal === true || islandVal === "true" || islandVal === 1
      ? "🟢 開放"
      : islandVal === false || islandVal === "false" || islandVal === 0
      ? "🔴 維護中"
      : "🟢 開放（預設）";

  const errStatus =
    errors1h == null
      ? "—"
      : errors1h > 20
      ? "🔥 高頻（>20）"
      : errors1h > 5
      ? "⚠️ 注意（5-20）"
      : "✅ 正常（≤5）";

  const lines: string[] = [
    `## 網站即時狀態快照（${nowTaipei()}）`,
    "",
    "**規模 / 流量**",
    `- 總用戶：${fmt(totalUsers)}（過去 24hr +${fmt(newUsers24h)}）`,
    `- 30 分鐘活躍：登入會員 ${fmt(activeUserSess30m)} 人 + 訪客 ${fmt(anonSess30m)} session`,
    `- 24hr AI 對話：${fmt(aiConvs24h)}`,
    "",
  ];

  // 現在誰在用（登入會員）
  if (activeUsers.length > 0) {
    lines.push("**現在誰在用（30 分鐘內活躍會員）**");
    activeUsers.forEach((u: any, i: number) => {
      const name = u.display_name || u.username || "—";
      lines.push(`${i + 1}. ${name} · Lv${u.level ?? 1} · ${formatRelative(u.last_active_at)}`);
    });
    lines.push("");
  }

  // 訪客足跡（最近頁面瀏覽）
  if (visitorPages.length > 0) {
    lines.push("**訪客足跡（30 分鐘內頁面瀏覽）**");
    const seen = new Set<string>();
    let n = 0;
    for (const p of visitorPages) {
      if (n >= 5) break;
      const key = p.path;
      if (seen.has(key)) continue;
      seen.add(key);
      n++;
      const loc = [p.country, p.city].filter(Boolean).join("/") || "—";
      lines.push(`${n}. \`${p.path}\` · ${loc} · ${formatRelative(p.last_seen_at)}`);
    }
    lines.push("");
  }

  lines.push(
    "**系統健康**",
    `- 過去 1 小時錯誤：${fmt(errors1h)} ${errStatus}`,
    `- 過去 24 小時錯誤：${fmt(errors24h)}`,
    `- 未讀通知：${fmt(unreadNotifs)}`,
    `- 待處理 ENV 申請：${fmt(pendingEnv)}`,
    `- 待處理檢舉：${fmt(pendingReports)}`,
    `- 待處理 ticket：${fmt(openTickets)}`,
    "",
    "**商務**",
    `- 24hr 訂單：${orders24h.length} 筆（已付款 ${paidOrders.length} 筆、收入 ${orderCurrency} ${orderRevenue.toLocaleString()}）`,
    "",
    "**島嶼**",
    `- 狀態：${islandState}`,
    "",
  );

  if (latestAudit.length > 0) {
    lines.push("**最新 admin 動作**");
    latestAudit.forEach((a: any, i: number) => {
      const when = formatRelative(a.created_at);
      lines.push(`${i + 1}. \`${a.action}\` by ${a.actor_username || "?"}${a.target_type ? ` on ${a.target_type}` : ""}（${when}）`);
    });
    lines.push("");
  }

  if (latestErrors.length > 0) {
    lines.push("**最新錯誤**");
    latestErrors.forEach((e: any, i: number) => {
      const when = formatRelative(e.created_at);
      const msg = String(e.message || "").slice(0, 80);
      lines.push(`${i + 1}. [${e.level || "log"}] ${e.source || "?"} — ${msg}（${when}）`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  if (diff < 60_000) return "剛剛";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小時前`;
  return `${Math.floor(diff / 86400_000)} 天前`;
}
