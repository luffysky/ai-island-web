/**
 * Period Report — 7 天 / 30 天指標 + 對比上一期變化、給 AI 寫敘事報告用。
 *
 * 設計目的：使用者問「給我這週重點」「這個月成長狀況」時，AI 不要拿一堆數字
 * 原樣丟回去、而是有變化趨勢 + 對比上一期 → 寫成 200-300 字叙事。
 *
 * 輸出格式：markdown 條列、AI 拿去整理成自然語言敘事。
 */

import { createSupabaseAdmin } from "./supabase-admin";

function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

function pct(prev: number | null, curr: number | null): string {
  if (prev == null || curr == null || prev === 0) {
    if (curr != null && curr > 0 && (prev === 0 || prev == null)) return "新出現";
    return "—";
  }
  const diff = curr - prev;
  const p = (diff / prev) * 100;
  const sign = diff > 0 ? "+" : "";
  return `${sign}${p.toFixed(0)}%（${sign}${diff}）`;
}

function safeCount(r: any): number | null {
  return typeof r?.count === "number" ? r.count : null;
}

export async function getPeriodReport(days: number): Promise<string> {
  const d = Math.max(1, Math.min(90, Math.floor(days)));
  const admin = createSupabaseAdmin();
  const now = Date.now();
  const periodMs = d * 86400_000;

  const thisStart = isoAgo(periodMs);
  const prevStart = isoAgo(periodMs * 2);
  const prevEnd = thisStart;

  // 並行抓所有指標、本期 + 上期
  const queries = await Promise.allSettled([
    // 新增用戶
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", thisStart),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", prevStart).lt("created_at", prevEnd),
    // AI 對話
    admin.from("ai_conversations").select("*", { count: "exact", head: true }).gte("created_at", thisStart),
    admin.from("ai_conversations").select("*", { count: "exact", head: true }).gte("created_at", prevStart).lt("created_at", prevEnd),
    // 訂單（含已付款）
    admin.from("orders").select("amount, status").gte("created_at", thisStart),
    admin.from("orders").select("amount, status").gte("created_at", prevStart).lt("created_at", prevEnd),
    // 錯誤
    admin.from("error_logs").select("*", { count: "exact", head: true }).gte("occurred_at", thisStart),
    admin.from("error_logs").select("*", { count: "exact", head: true }).gte("occurred_at", prevStart).lt("occurred_at", prevEnd),
    // 完課（lesson_progress.completed_at）
    admin.from("lesson_progress").select("*", { count: "exact", head: true }).gte("completed_at", thisStart).not("completed_at", "is", null),
    admin.from("lesson_progress").select("*", { count: "exact", head: true }).gte("completed_at", prevStart).lt("completed_at", prevEnd).not("completed_at", "is", null),
    // 論壇活動
    admin.from("forum_threads").select("*", { count: "exact", head: true }).gte("created_at", thisStart),
    admin.from("forum_replies").select("*", { count: "exact", head: true }).gte("created_at", thisStart),
    // 高頻 error source top 3
    admin.from("error_logs").select("source").gte("occurred_at", thisStart).limit(500),
    // 最活躍用戶 top 5（用 lesson_progress count）
    admin.from("xp_events").select("user_id, amount").gte("created_at", thisStart).limit(1000),
  ]);

  const [
    qNew, qNewPrev,
    qAi, qAiPrev,
    qOrders, qOrdersPrev,
    qErrors, qErrorsPrev,
    qCompleted, qCompletedPrev,
    qThreads, qReplies,
    qErrorSources,
    qXpEvents,
  ] = queries;

  const newUsers = qNew.status === "fulfilled" ? safeCount(qNew.value) : null;
  const newUsersPrev = qNewPrev.status === "fulfilled" ? safeCount(qNewPrev.value) : null;
  const aiConvs = qAi.status === "fulfilled" ? safeCount(qAi.value) : null;
  const aiConvsPrev = qAiPrev.status === "fulfilled" ? safeCount(qAiPrev.value) : null;
  const errors = qErrors.status === "fulfilled" ? safeCount(qErrors.value) : null;
  const errorsPrev = qErrorsPrev.status === "fulfilled" ? safeCount(qErrorsPrev.value) : null;
  const completed = qCompleted.status === "fulfilled" ? safeCount(qCompleted.value) : null;
  const completedPrev = qCompletedPrev.status === "fulfilled" ? safeCount(qCompletedPrev.value) : null;
  const threads = qThreads.status === "fulfilled" ? safeCount(qThreads.value) : null;
  const replies = qReplies.status === "fulfilled" ? safeCount(qReplies.value) : null;

  // 訂單收入聚合
  const orders: any[] = qOrders.status === "fulfilled" ? qOrders.value.data ?? [] : [];
  const ordersPrev: any[] = qOrdersPrev.status === "fulfilled" ? qOrdersPrev.value.data ?? [] : [];
  const paidThis = orders.filter((o) => o.status === "paid" || o.status === "completed");
  const paidPrev = ordersPrev.filter((o) => o.status === "paid" || o.status === "completed");
  const revenue = paidThis.reduce((s, o) => s + Number(o.amount || 0), 0);
  const revenuePrev = paidPrev.reduce((s, o) => s + Number(o.amount || 0), 0);

  // 高頻 error source top 3
  const errorSrcs: any[] = qErrorSources.status === "fulfilled" ? qErrorSources.value.data ?? [] : [];
  const srcCount: Record<string, number> = {};
  for (const e of errorSrcs) {
    const s = e.source || "unknown";
    srcCount[s] = (srcCount[s] || 0) + 1;
  }
  const topSources = Object.entries(srcCount).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // 最活躍 user top 5
  const xpEvents: any[] = qXpEvents.status === "fulfilled" ? qXpEvents.value.data ?? [] : [];
  const userXp: Record<string, number> = {};
  for (const e of xpEvents) {
    userXp[e.user_id] = (userXp[e.user_id] || 0) + Number(e.amount || 0);
  }
  const topUsers = Object.entries(userXp).sort((a, b) => b[1] - a[1]).slice(0, 5);
  // 取 username
  let topUserNames: { username: string; xp: number }[] = [];
  if (topUsers.length > 0) {
    const { data: ps } = await admin
      .from("profiles")
      .select("id, username, display_name")
      .in("id", topUsers.map(([id]) => id));
    topUserNames = topUsers.map(([id, xp]) => {
      const p = (ps ?? []).find((x: any) => x.id === id);
      return {
        username: p ? (p.display_name || p.username) : id.slice(0, 8),
        xp,
      };
    });
  }

  const periodLabel = d === 7 ? "本週" : d === 30 ? "本月" : `本期 ${d} 天`;
  const prevLabel = d === 7 ? "上週" : d === 30 ? "上月" : `上期 ${d} 天`;

  const lines = [
    `## ${periodLabel} vs ${prevLabel} 比較報告（${d} 天）`,
    "",
    "**規模 / 互動**",
    `- 新增用戶：${newUsers ?? "—"}（${pct(newUsersPrev, newUsers)}）`,
    `- AI 對話：${aiConvs ?? "—"}（${pct(aiConvsPrev, aiConvs)}）`,
    `- 完課數：${completed ?? "—"}（${pct(completedPrev, completed)}）`,
    `- 論壇活動：${threads ?? 0} 新貼 + ${replies ?? 0} 回覆`,
    "",
    "**商務**",
    `- 訂單：${orders.length} 筆（已付款 ${paidThis.length}）`,
    `- 收入：NT$ ${revenue.toLocaleString()}（${pct(revenuePrev, revenue)}）`,
    "",
    "**系統健康**",
    `- 錯誤：${errors ?? "—"}（${pct(errorsPrev, errors)}）`,
  ];

  if (topSources.length > 0) {
    lines.push(`- 高頻 error source：` + topSources.map(([s, c]) => `${s} × ${c}`).join(" / "));
  }

  if (topUserNames.length > 0) {
    lines.push("", "**最活躍 top 5（依 XP）**");
    topUserNames.forEach((u, i) => lines.push(`${i + 1}. ${u.username} · +${u.xp.toLocaleString()} XP`));
  }

  lines.push("", "**指引**：拿這份資料寫 200-300 字繁中敘事報告。重點：");
  lines.push("- 找出最值得注意的 1-2 個變化（不是流水帳）");
  lines.push("- 用「人」的語氣、像給董事長 elevator pitch");
  lines.push("- 異常數字 (>50% 變化) 要強調 + 推測原因 + 建議行動");
  lines.push("- 別貼原始數字、用「成長 X 倍」「下降 X 成」這種對話語氣");

  return lines.join("\n");
}
