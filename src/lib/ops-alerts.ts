/**
 * 主動營運告警 (P1) — 一組即時檢查、任一觸發就 notifyAdmin。
 *
 * 兩個 caller：
 *  1. cron /api/cron/ops-alerts → runOpsAlertsAndNotify()（偵測 + 推播）
 *  2. 後台首頁「今日營運」→ runOpsAlertChecks()（只算、給畫面顯示目前觸發中的告警）
 *
 * 所有數字都是「當下即時查 DB」算出來的、沒有任何寫死。
 *
 * 檢查項目：
 *  (a) ai_daily_cost      今日 AI 成本 > 每日預算門檻
 *  (b) user_ai_spike      單一使用者當日 AI 成本異常（> 固定上限 或 > 中位數 N 倍）
 *  (c) failed_orders_24h  近 24h 金流失敗訂單數 > 門檻
 *  (d) errors_1h          近 1h error_logs 暴增 > 門檻
 *  (e) churn_risk         churn 高風險用戶數 > 門檻（30 天內活躍但近 14 天沉默）
 *
 * 門檻全部可在 app_settings.ops_alert_thresholds (jsonb) 調整、缺值走預設。
 */

import { createSupabaseAdmin } from "./supabase-admin";
import { getAppSetting } from "./app-settings";
import { notifyAdmin } from "./notify-admin";

export type OpsAlertLevel = "error" | "warn" | "info";

export type OpsAlert = {
  key: string; // dedupe key（同分鐘同 key 只推一次）
  level: OpsAlertLevel;
  title: string;
  detail: string;
  value?: number; // 觸發當下的量值（給畫面顯示）
  threshold?: number; // 對應門檻
};

export type OpsAlertThresholds = {
  /** 今日全站 AI 成本上限 (USD)、超過 → 告警 */
  ai_daily_budget_usd: number;
  /** 單一使用者當日 AI 成本固定上限 (USD) */
  user_daily_ai_usd_cap: number;
  /** 單一使用者當日 AI 成本超過「當日中位數 × 此倍數」也算異常 */
  user_daily_ai_median_mult: number;
  /** 近 24h 金流失敗 (failed) 訂單數門檻 */
  failed_orders_24h: number;
  /** 近 1h error_logs 筆數門檻 */
  errors_1h: number;
  /** churn 高風險人數門檻 */
  churn_risk_count: number;
};

/** 合理預設 — app_settings 沒設 / 缺欄位時用。全部可被 DB 覆寫。 */
export const DEFAULT_OPS_THRESHOLDS: OpsAlertThresholds = {
  ai_daily_budget_usd: 10,
  user_daily_ai_usd_cap: 3,
  user_daily_ai_median_mult: 5,
  failed_orders_24h: 3,
  errors_1h: 20,
  churn_risk_count: 20,
};

/**
 * 讀門檻：app_settings.ops_alert_thresholds (jsonb) 疊在預設上。
 * 缺 key / 型別不對 → 用預設值。可在 /admin/app-settings 或 /admin/settings 調整。
 */
export async function getOpsThresholds(): Promise<OpsAlertThresholds> {
  const raw = await getAppSetting<Partial<OpsAlertThresholds> | null>(
    "ops_alert_thresholds",
    null,
  );
  const merged: OpsAlertThresholds = { ...DEFAULT_OPS_THRESHOLDS };
  if (raw && typeof raw === "object") {
    for (const k of Object.keys(DEFAULT_OPS_THRESHOLDS) as (keyof OpsAlertThresholds)[]) {
      const v = (raw as any)[k];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) merged[k] = v;
    }
  }
  return merged;
}

function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * 跑全部檢查、回傳目前觸發中的告警清單（不推播）。
 * 每項獨立 try/catch — 某張表壞了不影響其他檢查。
 */
export async function runOpsAlertChecks(): Promise<{
  alerts: OpsAlert[];
  thresholds: OpsAlertThresholds;
}> {
  const admin = createSupabaseAdmin();
  const t = await getOpsThresholds();
  const alerts: OpsAlert[] = [];
  const today = todayDateStr();

  // (a) 今日全站 AI 成本 vs 每日預算 —— 即時 sum(ai_usage_daily.cost_usd) where date = today
  let todayAiRows: any[] = [];
  try {
    const { data } = await admin
      .from("ai_usage_daily")
      .select("user_id, cost_usd")
      .eq("date", today);
    todayAiRows = (data as any[]) ?? [];
    const totalToday = todayAiRows.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);
    if (totalToday > t.ai_daily_budget_usd) {
      alerts.push({
        key: "ai_daily_cost",
        level: "warn",
        title: "今日 AI 成本超標",
        detail: `今日全站 AI 成本 $${totalToday.toFixed(2)} 已超過每日預算門檻 $${t.ai_daily_budget_usd.toFixed(2)}。`,
        value: Math.round(totalToday * 100) / 100,
        threshold: t.ai_daily_budget_usd,
      });
    }
  } catch {}

  // (b) 單一使用者當日 AI 成本異常 —— 用上面同一批 rows 聚合 per user
  try {
    const byUser: Record<string, number> = {};
    for (const r of todayAiRows) {
      if (!r.user_id) continue;
      byUser[r.user_id] = (byUser[r.user_id] ?? 0) + Number(r.cost_usd ?? 0);
    }
    const costs = Object.values(byUser);
    if (costs.length > 0) {
      const med = median(costs);
      const dynamicCap = med > 0 ? med * t.user_daily_ai_median_mult : Infinity;
      const outliers = Object.entries(byUser)
        .filter(([, c]) => c > t.user_daily_ai_usd_cap || c > dynamicCap)
        .sort((a, b) => b[1] - a[1]);
      if (outliers.length > 0) {
        const [uid, cost] = outliers[0];
        alerts.push({
          key: "user_ai_spike",
          level: "warn",
          title: "使用者 AI 成本異常",
          detail:
            `今日有 ${outliers.length} 位使用者 AI 成本異常。最高：user ${uid.slice(0, 8)} 花 $${cost.toFixed(2)}` +
            `（固定上限 $${t.user_daily_ai_usd_cap}、當日中位數 $${med.toFixed(2)} × ${t.user_daily_ai_median_mult}）。`,
          value: Math.round(cost * 100) / 100,
          threshold: t.user_daily_ai_usd_cap,
        });
      }
    }
  } catch {}

  // (c) 近 24h 金流失敗訂單數 —— orders status=failed created_at >= 24h ago
  try {
    const { count } = await admin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["failed"])
      .gte("created_at", isoAgo(86400_000));
    const n = count ?? 0;
    if (n > t.failed_orders_24h) {
      alerts.push({
        key: "failed_orders_24h",
        level: "warn",
        title: "金流失敗訂單激增",
        detail: `近 24 小時有 ${n} 筆金流失敗 (failed) 訂單、超過門檻 ${t.failed_orders_24h}。可能金流商異常或盜刷試卡。`,
        value: n,
        threshold: t.failed_orders_24h,
      });
    }
  } catch {}

  // (d) 近 1h error_logs 暴增 —— error_logs occurred_at >= 1h ago
  try {
    const { count } = await admin
      .from("error_logs")
      .select("*", { count: "exact", head: true })
      .gte("occurred_at", isoAgo(3600_000));
    const n = count ?? 0;
    if (n > t.errors_1h) {
      alerts.push({
        key: "errors_1h",
        level: "error",
        title: "錯誤日誌暴增",
        detail: `近 1 小時累積 ${n} 筆 error log、超過門檻 ${t.errors_1h}。建議立刻看 /admin/errors。`,
        value: n,
        threshold: t.errors_1h,
      });
    }
  } catch {}

  // (e) churn 高風險 —— 30 天內曾活躍、但近 14 天沉默的用戶數（last_active_at 區間）
  try {
    const { count } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("last_active_at", isoAgo(30 * 86400_000))
      .lt("last_active_at", isoAgo(14 * 86400_000))
      .is("banned_at", null)
      .is("deleted_at", null);
    const n = count ?? 0;
    if (n > t.churn_risk_count) {
      alerts.push({
        key: "churn_risk",
        level: "info",
        title: "流失風險用戶偏高",
        detail: `目前有 ${n} 位用戶近 14 天沒回來（但 30 天內曾活躍）、超過門檻 ${t.churn_risk_count}。可考慮召回 campaign。`,
        value: n,
        threshold: t.churn_risk_count,
      });
    }
  } catch {}

  return { alerts, thresholds: t };
}

/**
 * cron 主流程：偵測 → 逐則 notifyAdmin（站內/LINE/TG/Discord 由 notify-admin routing 決定）。
 * notify-admin 自帶同分鐘 dedupe、不會 spam。
 */
export async function runOpsAlertsAndNotify(): Promise<{
  checked: true;
  count: number;
  alerts: OpsAlert[];
  thresholds: OpsAlertThresholds;
}> {
  const { alerts, thresholds } = await runOpsAlertChecks();

  for (const a of alerts) {
    const emoji = a.level === "error" ? "🚨" : a.level === "warn" ? "⚠️" : "📊";
    await notifyAdmin({
      kind: a.level === "error" ? "error" : "ai_cost",
      dedupeKey: `ops:${a.key}`,
      text: `${emoji} 營運告警｜${a.title}\n\n${a.detail}`,
    });
  }

  return { checked: true, count: alerts.length, alerts, thresholds };
}
