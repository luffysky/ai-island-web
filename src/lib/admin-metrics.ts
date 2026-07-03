/**
 * 後台 AI 營運助手 — 唯讀「指標白名單」（P3）
 *
 * ⚠️ 安全核心：AI **永遠不能**下任意 SQL。它只能從下面這張白名單裡「按名字 + 參數」呼叫函式。
 * 每支函式都是寫死的、參數化的 Supabase 唯讀查詢、只回小結果（總數 / 加總 / Top N）。
 * route (`/api/admin/assistant`) 只會執行 `METRICS` 裡註冊過的 key、其它一律忽略。
 *
 * 欄位已用 information_schema 對過（見 scripts/audit-db-columns.mjs 同源）：
 *   orders(amount,status,paid_at,created_at,user_id) / profiles(created_at,last_active_at,banned_at,deleted_at)
 *   subscriptions(plan,plan_price,status) / ai_api_keys(provider,used_this_month_usd,monthly_budget_usd)
 *   ai_usage_daily(date,cost_usd,message_count) / tickets(status,priority)
 * 使用的表跟 admin/page.tsx（P1 總覽）同一批、語意一致。
 */

import { createSupabaseAdmin } from "./supabase-admin";

// ---------- 小工具 ----------
const clampInt = (v: any, min: number, max: number, dflt: number): number => {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return dflt;
  return Math.max(min, Math.min(max, n));
};

const startOfToday = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
};
const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
};
const daysAgoIso = (days: number) => new Date(Date.now() - days * 86400_000).toISOString();

/** 分頁撈滿（避免 PostgREST 1000 筆默默截斷）；上限保護、最多 maxRows 筆。 */
async function fetchAllRows<T = any>(
  build: (admin: ReturnType<typeof createSupabaseAdmin>) => any,
  maxRows = 20000,
): Promise<T[]> {
  const admin = createSupabaseAdmin();
  const pageSize = 1000;
  const out: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await build(admin).range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = (data as T[]) ?? [];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

// ---------- 白名單指標定義 ----------
export interface MetricDef {
  /** 給意圖分類 prompt 讀的說明 */
  description: string;
  /** 參數說明（給 prompt）；沒有參數就省略 */
  args?: Record<string, string>;
  /** 實際執行 — 一律 server-side、參數化、回小結果 */
  run: (args: Record<string, any>) => Promise<any>;
}

export const METRICS: Record<string, MetricDef> = {
  revenueToday: {
    description: "今日已付款營收（NT$）與筆數",
    run: async () => {
      const rows = await fetchAllRows<{ amount: number }>((a) =>
        a.from("orders").select("amount").eq("status", "paid").gte("paid_at", startOfToday()),
      );
      const revenue = rows.reduce((s, o) => s + Number(o.amount ?? 0), 0);
      return { currency: "TWD", revenue, orders: rows.length, since: startOfToday() };
    },
  },

  revenueThisMonth: {
    description: "本月（1 號起）已付款營收（NT$）與筆數",
    run: async () => {
      const rows = await fetchAllRows<{ amount: number }>((a) =>
        a.from("orders").select("amount").eq("status", "paid").gte("paid_at", startOfMonth()),
      );
      const revenue = rows.reduce((s, o) => s + Number(o.amount ?? 0), 0);
      return { currency: "TWD", revenue, orders: rows.length, since: startOfMonth() };
    },
  },

  newUsers: {
    description: "近 N 天新註冊用戶數",
    args: { days: "回看天數，1~365，預設 7" },
    run: async (args) => {
      const days = clampInt(args.days, 1, 365, 7);
      const admin = createSupabaseAdmin();
      const { count, error } = await admin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", daysAgoIso(days));
      if (error) throw new Error(error.message);
      return { days, newUsers: count ?? 0 };
    },
  },

  activeUsers: {
    description: "近 N 天活躍用戶數（last_active_at 落在區間、排除已封鎖）",
    args: { days: "回看天數，1~90，預設 7" },
    run: async (args) => {
      const days = clampInt(args.days, 1, 90, 7);
      const admin = createSupabaseAdmin();
      const { count, error } = await admin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("last_active_at", daysAgoIso(days))
        .is("banned_at", null);
      if (error) throw new Error(error.message);
      return { days, activeUsers: count ?? 0 };
    },
  },

  churnRiskCount: {
    description:
      "流失風險用戶數：曾經活躍但最近變沉默（last_active_at 落在 14~30 天前、未封鎖、未刪帳）",
    run: async () => {
      const admin = createSupabaseAdmin();
      const { count, error } = await admin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("last_active_at", daysAgoIso(30))
        .lt("last_active_at", daysAgoIso(14))
        .is("banned_at", null)
        .is("deleted_at", null);
      if (error) throw new Error(error.message);
      return { churnRisk: count ?? 0, definition: "last_active_at 在 14~30 天前" };
    },
  },

  aiCostThisMonth: {
    description: "本月 AI 花費（USD）— 來自各 API key 的 used_this_month_usd 與 ai_usage_daily 明細加總",
    run: async () => {
      const admin = createSupabaseAdmin();
      const [{ data: keys, error: e1 }, dailyRows] = await Promise.all([
        admin.from("ai_api_keys").select("provider, used_this_month_usd, monthly_budget_usd"),
        fetchAllRows<{ cost_usd: number }>((a) =>
          a.from("ai_usage_daily").select("cost_usd").gte("date", startOfMonth().slice(0, 10)),
        ),
      ]);
      if (e1) throw new Error(e1.message);
      const byKey = ((keys as any[]) ?? []).map((k) => ({
        provider: k.provider,
        usedUsd: Number(k.used_this_month_usd ?? 0),
        budgetUsd: Number(k.monthly_budget_usd ?? 0),
      }));
      const usdFromKeys = byKey.reduce((s, k) => s + k.usedUsd, 0);
      const usdFromDaily = dailyRows.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);
      return { usdFromKeys: Number(usdFromKeys.toFixed(4)), usdFromDaily: Number(usdFromDaily.toFixed(4)), byKey };
    },
  },

  topSpenders: {
    description: "近 N 天累計付款金額最高的用戶 Top K（含 username）",
    args: { days: "回看天數，1~365，預設 30", limit: "回幾名，1~20，預設 10" },
    run: async (args) => {
      const days = clampInt(args.days, 1, 365, 30);
      const limit = clampInt(args.limit, 1, 20, 10);
      const rows = await fetchAllRows<{ user_id: string; amount: number }>((a) =>
        a.from("orders").select("user_id, amount").eq("status", "paid").gte("paid_at", daysAgoIso(days)),
      );
      const byUser = new Map<string, number>();
      for (const o of rows) {
        if (!o.user_id) continue;
        byUser.set(o.user_id, (byUser.get(o.user_id) ?? 0) + Number(o.amount ?? 0));
      }
      const top = [...byUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
      const ids = top.map(([id]) => id);
      const admin = createSupabaseAdmin();
      const nameMap = new Map<string, string>();
      if (ids.length) {
        const { data: people } = await admin.from("profiles").select("id, username, display_name").in("id", ids);
        for (const p of (people as any[]) ?? []) nameMap.set(p.id, p.display_name || p.username || p.id.slice(0, 8));
      }
      return {
        days,
        currency: "TWD",
        topSpenders: top.map(([id, total], i) => ({ rank: i + 1, user: nameMap.get(id) ?? id.slice(0, 8), total })),
      };
    },
  },

  openTickets: {
    description: "待處理客服工單數（status=open），含緊急數",
    run: async () => {
      const admin = createSupabaseAdmin();
      const [{ count: open, error: e1 }, { count: urgent, error: e2 }] = await Promise.all([
        admin.from("tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
        admin.from("tickets").select("*", { count: "exact", head: true }).eq("status", "open").eq("priority", "urgent"),
      ]);
      if (e1 || e2) throw new Error(e1?.message || e2?.message);
      return { openTickets: open ?? 0, urgentOpen: urgent ?? 0 };
    },
  },

  subscriptionStats: {
    description: "訂閱概況：有效訂閱數、MRR（NT$，活躍訂閱月費加總）、各方案分布",
    run: async () => {
      const rows = await fetchAllRows<{ plan: string; plan_price: number; status: string }>((a) =>
        a.from("subscriptions").select("plan, plan_price, status").eq("status", "active"),
      );
      const mrr = rows.reduce((s, r) => s + Number(r.plan_price ?? 0), 0);
      const byPlan: Record<string, number> = {};
      for (const r of rows) byPlan[r.plan ?? "unknown"] = (byPlan[r.plan ?? "unknown"] ?? 0) + 1;
      return { currency: "TWD", activeSubscriptions: rows.length, mrr, byPlan };
    },
  },

  orderStats: {
    description: "近 N 天訂單概況：依狀態（paid / refunded / pending…）的筆數與金額",
    args: { days: "回看天數，1~365，預設 30" },
    run: async (args) => {
      const days = clampInt(args.days, 1, 365, 30);
      const rows = await fetchAllRows<{ status: string; amount: number }>((a) =>
        a.from("orders").select("status, amount").gte("created_at", daysAgoIso(days)),
      );
      const byStatus: Record<string, { orders: number; amount: number }> = {};
      for (const o of rows) {
        const k = o.status ?? "unknown";
        byStatus[k] ??= { orders: 0, amount: 0 };
        byStatus[k].orders += 1;
        byStatus[k].amount += Number(o.amount ?? 0);
      }
      return { days, currency: "TWD", totalOrders: rows.length, byStatus };
    },
  },
};

export type MetricName = keyof typeof METRICS;

/** 白名單目錄（給意圖分類 prompt / 前端 capability 提示）。 */
export function metricCatalog(): Array<{ name: string; description: string; args?: Record<string, string> }> {
  return Object.entries(METRICS).map(([name, def]) => ({ name, description: def.description, args: def.args }));
}

/** 人類可讀能力清單（無匹配時回給使用者）。 */
export const CAPABILITY_LIST_ZH: string[] = [
  "今日 / 本月營收",
  "近 N 天新註冊、活躍用戶數",
  "流失風險用戶數",
  "本月 AI 花費（USD）",
  "付款金額 Top N 用戶",
  "待處理客服工單數",
  "訂閱概況與 MRR",
  "近 N 天訂單狀態分布",
];

/** 安全執行：只跑白名單內的 key，其它一律拒絕（防任意呼叫）。 */
export async function runMetric(name: string, args: Record<string, any> = {}): Promise<any> {
  const def = METRICS[name as MetricName];
  if (!def) throw new Error(`unknown_metric:${name}`);
  return def.run(args ?? {});
}
