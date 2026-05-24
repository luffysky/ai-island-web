/**
 * Anomaly Detection — 定時跑、發現異常時讓 AI 寫三句話報告推 LINE。
 *
 * 觸發時機：外部 cron 每 15-30 分鐘打 /api/cron/anomaly-check（帶 CRON_SECRET）。
 *
 * 偵測邏輯：
 *  - 過去 30 分鐘 error 數 > 過去 24hr 平均 * 3、且 > 5 → ⚠️ 錯誤激增
 *  - pending tickets > 10 → 💌 客服積壓
 *  - pending env_change_requests > 3 → 🔐 ENV 申請積壓
 *  - pending user_reports > 5 → 🚨 檢舉積壓
 *  - 24hr 訂單收入 < 過去 7 天平均 * 0.3、且過去 7 天有訂單 → 💸 訂單異常下降
 *  - 30 分鐘活躍 session = 0 且過去 24hr 有 > 50 → 👻 流量斷崖
 *
 * 任一觸發 → 收集所有異常 → 呼叫 AI 寫三句話報告 → notifyAdmin LINE 推。
 * 整段去重：同分鐘內同類異常只推一次（notifyAdmin 自帶 dedupe）。
 */

import { createSupabaseAdmin } from "./supabase-admin";
import { decryptKey } from "./ai-crypto";
import { callAI } from "./ai-providers";
import { notifyAdmin } from "./notify-admin";
import { buildSimpleCard } from "./line-flex";

type Anomaly = {
  key: string;       // dedupe key
  level: "warn" | "error" | "info";
  title: string;
  detail: string;
};

function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

function safeCount(r: any): number | null {
  return typeof r?.count === "number" ? r.count : null;
}

export async function detectAnomalies(): Promise<Anomaly[]> {
  const admin = createSupabaseAdmin();
  const anomalies: Anomaly[] = [];

  const [
    errors30m,
    errors24h,
    pendingTickets,
    pendingEnv,
    pendingReports,
    orders24h,
    orders7d,
    activeSess30m,
    sess24h,
  ] = await Promise.all([
    admin.from("error_logs").select("*", { count: "exact", head: true }).gte("created_at", isoAgo(1800_000)),
    admin.from("error_logs").select("*", { count: "exact", head: true }).gte("created_at", isoAgo(86400_000)),
    admin.from("tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
    admin.from("env_change_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("user_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("orders").select("amount, status").gte("created_at", isoAgo(86400_000)),
    admin.from("orders").select("amount, status, created_at").gte("created_at", isoAgo(7 * 86400_000)),
    admin.from("analytics_sessions").select("*", { count: "exact", head: true }).gte("last_seen_at", isoAgo(1800_000)),
    admin.from("analytics_sessions").select("*", { count: "exact", head: true }).gte("last_seen_at", isoAgo(86400_000)),
  ]);

  // 1. 錯誤激增
  const err30 = safeCount(errors30m);
  const err24 = safeCount(errors24h);
  if (err30 != null && err24 != null) {
    const avg30m = err24 / 48; // 24hr / 48 個 30 分鐘
    if (err30 > Math.max(5, avg30m * 3)) {
      anomalies.push({
        key: "errors_spike",
        level: "error",
        title: "錯誤激增",
        detail: `過去 30 分鐘 ${err30} 條 error log、相對 24hr 平均（${avg30m.toFixed(1)}/30min）的 ${(err30 / Math.max(1, avg30m)).toFixed(1)} 倍。`,
      });
    }
  }

  // 2. 客服積壓
  const tix = safeCount(pendingTickets);
  if (tix != null && tix > 10) {
    anomalies.push({
      key: "tickets_overflow",
      level: "warn",
      title: "客服積壓",
      detail: `目前有 ${tix} 個 open 狀態的 ticket、超過警戒線 10。`,
    });
  }

  // 3. ENV 申請積壓
  const envR = safeCount(pendingEnv);
  if (envR != null && envR > 3) {
    anomalies.push({
      key: "env_requests_overflow",
      level: "info",
      title: "ENV 申請積壓",
      detail: `有 ${envR} 個 pending ENV 變更申請等你處理。`,
    });
  }

  // 4. 檢舉積壓
  const reps = safeCount(pendingReports);
  if (reps != null && reps > 5) {
    anomalies.push({
      key: "reports_overflow",
      level: "warn",
      title: "檢舉積壓",
      detail: `有 ${reps} 個 pending 檢舉等審核。`,
    });
  }

  // 5. 訂單異常下降
  const orders24Data: any[] = orders24h.data ?? [];
  const orders7dData: any[] = orders7d.data ?? [];
  const paid24h = orders24Data.filter((o) => o.status === "paid" || o.status === "completed");
  const paid7d = orders7dData.filter((o) => o.status === "paid" || o.status === "completed");
  const revenue24h = paid24h.reduce((s, o) => s + Number(o.amount || 0), 0);
  const revenue7d = paid7d.reduce((s, o) => s + Number(o.amount || 0), 0);
  const dailyAvg = revenue7d / 7;
  if (dailyAvg > 100 && revenue24h < dailyAvg * 0.3) {
    anomalies.push({
      key: "revenue_drop",
      level: "warn",
      title: "訂單收入異常下降",
      detail: `過去 24hr 收入 NT$ ${revenue24h.toLocaleString()}、低於 7 日平均（${dailyAvg.toFixed(0)}）的 30%。`,
    });
  }

  // 6. 流量斷崖
  const sess30 = safeCount(activeSess30m);
  const sess24 = safeCount(sess24h);
  if (sess30 === 0 && sess24 != null && sess24 > 50) {
    anomalies.push({
      key: "traffic_cliff",
      level: "error",
      title: "流量斷崖",
      detail: `過去 30 分鐘 0 個活躍 session、但 24hr 內曾有 ${sess24} 個。網站可能掛了。`,
    });
  }

  return anomalies;
}

/**
 * 偵測到的異常餵給 AI 寫成 2-3 句話的 admin 報告。
 * 失敗 fallback 用原始 detail 串起來。
 */
export async function buildAnomalyReport(anomalies: Anomaly[]): Promise<string> {
  if (anomalies.length === 0) return "";

  const raw = anomalies.map((a) => `- [${a.level}] ${a.title}：${a.detail}`).join("\n");

  // 拿 anthropic key、AI 整合
  try {
    const admin = createSupabaseAdmin();
    const { data: models } = await admin.from("ai_models").select("*").eq("is_active", true).eq("provider", "anthropic").limit(1);
    const model = (models as any[])?.[0];
    if (!model) return raw;
    const { data: sysKey } = await admin
      .from("ai_api_keys")
      .select("api_key_encrypted, enabled")
      .eq("provider", "anthropic")
      .maybeSingle();
    if (!sysKey || !(sysKey as any).enabled) return raw;
    const apiKey = decryptKey((sysKey as any).api_key_encrypted);

    const prompt = `下面是系統偵測到的異常：

${raw}

任務：用繁中寫 2-3 句話「人話版」報告給 admin（在 LINE 看的）。
要求：
- 開頭就抓重點、不要說「親愛的 admin」這種廢話
- 異常嚴重程度判斷 → 哪個最緊急 / 哪個可以晚點看
- 給 1 個具體建議行動（例如「先看 /errors」「打開 maint 模式」「不急、明天再看」）
- 不超過 150 字`;

    const resp = await callAI({
      provider: "anthropic",
      model: model.model_name,
      apiKey,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      maxTokens: 400,
    });
    return resp.text.trim() || raw;
  } catch {
    return raw;
  }
}

/**
 * 主流程：偵測 → AI 報告 → 推 LINE。給 cron endpoint 呼叫。
 */
export async function runAnomalyCheck(): Promise<{ count: number; pushed: boolean }> {
  const anomalies = await detectAnomalies();
  if (anomalies.length === 0) return { count: 0, pushed: false };

  const aiReport = await buildAnomalyReport(anomalies);
  const topLevel: "error" | "warn" | "info" =
    anomalies.some((a) => a.level === "error") ? "error" : anomalies.some((a) => a.level === "warn") ? "warn" : "info";

  const accentColor = topLevel === "error" ? "#ff5555" : topLevel === "warn" ? "#ffb86c" : "#8be9fd";
  const emoji = topLevel === "error" ? "🚨" : topLevel === "warn" ? "⚠️" : "📊";
  const titleTag = topLevel === "error" ? "緊急" : topLevel === "warn" ? "注意" : "提醒";

  // dedupe key：每個異常的 key 合起來
  const dedupeKey = anomalies.map((a) => a.key).sort().join(",");

  await notifyAdmin({
    kind: "anomaly_check",
    dedupeKey,
    text: `${emoji} 系統異常偵測（${titleTag}）\n\n${aiReport}\n\n— 異常項目 —\n${anomalies.map((a) => `${a.title}：${a.detail}`).join("\n")}`,
    flex: buildSimpleCard({
      emoji,
      title: `系統異常偵測（${titleTag}）`,
      accentColor,
      body: aiReport,
      meta: anomalies.map((a) => ({ label: a.title, value: a.detail.slice(0, 60) })),
    }),
  });

  return { count: anomalies.length, pushed: true };
}
