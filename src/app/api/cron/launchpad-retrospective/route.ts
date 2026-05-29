import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { notifyAdmin } from "@/lib/notify-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Launchpad 每月 retrospective — 每月 1 號 09:00 台灣（= UTC 01:00）
 * 推到 admin LINE / TG / Discord
 *
 * 統計：
 *   1. 上月完成（DONE column 新增的 cards、看 updated_at）
 *   2. 待辦堆積（TODO + DOING 數）
 *   3. 最久沒動的 5 張卡（updated_at 最早的）
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const got = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (!expected || got !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdmin();

  // 上個月起訖
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthLabel = `${startOfLastMonth.getFullYear()}/${String(startOfLastMonth.getMonth() + 1).padStart(2, "0")}`;

  // 找所有 DONE column
  const { data: doneCols } = await admin.from("admin_kanban_columns").select("id, title").in("title", ["DONE", "已上線", "採納"]);
  const doneIds = (doneCols ?? []).map((c: any) => c.id);

  const { data: doneRecent } = await admin
    .from("admin_kanban_cards")
    .select("title, category, updated_at")
    .in("column_id", doneIds.length > 0 ? doneIds : ["00000000-0000-0000-0000-000000000000"])
    .gte("updated_at", startOfLastMonth.toISOString())
    .lt("updated_at", startOfThisMonth.toISOString())
    .order("updated_at", { ascending: false });

  // TODO / DOING / 想法 / 評估中 / 待開發 / 進行中 — 都算「未完成」
  const { data: activeCols } = await admin.from("admin_kanban_columns")
    .select("id, title").in("title", ["TODO", "DOING", "想法", "評估中", "待開發", "進行中"]);
  const activeIds = (activeCols ?? []).map((c: any) => c.id);

  const { count: backlog } = await admin.from("admin_kanban_cards")
    .select("id", { count: "exact", head: true })
    .in("column_id", activeIds.length > 0 ? activeIds : ["00000000-0000-0000-0000-000000000000"]);

  // 最久沒動的 5 張
  const { data: oldest } = await admin.from("admin_kanban_cards")
    .select("title, category, updated_at")
    .in("column_id", activeIds.length > 0 ? activeIds : ["00000000-0000-0000-0000-000000000000"])
    .order("updated_at", { ascending: true })
    .limit(5);

  const doneCount = doneRecent?.length ?? 0;
  const doneByCat: Record<string, number> = {};
  for (const c of (doneRecent ?? []) as any[]) {
    const cat = c.category ?? "(無)";
    doneByCat[cat] = (doneByCat[cat] ?? 0) + 1;
  }

  const doneByCatLine = Object.entries(doneByCat)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}`).join(" / ");

  const oldestLines = (oldest ?? []).map((o: any, i: number) => {
    const days = Math.floor((Date.now() - new Date(o.updated_at).getTime()) / 86400_000);
    return `${i + 1}. ${o.title}（${days} 天沒動）`;
  }).join("\n");

  const summary =
    `📊 ${lastMonthLabel} Launchpad Retrospective\n` +
    `\n` +
    `✅ 上月完成 ${doneCount} 張\n` +
    (doneByCatLine ? `   ${doneByCatLine}\n` : "") +
    `📌 待辦堆積：${backlog ?? 0} 張\n` +
    `\n` +
    (oldestLines ? `🐌 最久沒動 (TOP 5)：\n${oldestLines}\n` : "");

  await notifyAdmin({
    kind: "system",
    dedupeKey: `retrospective:${lastMonthLabel}`,
    text: `[retrospective] ${lastMonthLabel} 月度回顧\n${summary}`,
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    month: lastMonthLabel,
    done_count: doneCount,
    backlog,
    oldest_count: oldest?.length ?? 0,
    summary,
  });
}
