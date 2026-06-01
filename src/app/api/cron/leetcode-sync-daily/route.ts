import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { fetchLatestLeetcodeProblems } from "@/lib/leetcode-problems-fetch";
import { verifyCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 每日 LeetCode 題庫同步 — 抓最新 N 題、UPSERT 進 leetcode_problems
 *
 * 觸發：GET /api/cron/leetcode-sync-daily?secret=$CRON_SECRET
 * 排程：cron-job.org 每天 17:00 UTC（= 台灣 01:00 凌晨）
 *
 * 增量策略：LeetCode 一週新增約 2-5 題、預設抓最新 100 題就涵蓋一整年
 * （UPSERT 重複的會更新、新的會 insert）
 */
export async function GET(req: NextRequest) {
  const authErr = verifyCronAuth(req);
  if (authErr) return authErr;

  const admin = createSupabaseAdmin();
  const before = await admin.from("leetcode_problems").select("id", { count: "exact", head: true });
  const beforeCount = before.count ?? 0;

  let problems;
  try {
    problems = await fetchLatestLeetcodeProblems(100);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "fetch_failed" }, { status: 502 });
  }

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const p of problems) {
    const { error } = await admin.from("leetcode_problems").upsert({
      number: p.number,
      slug: p.slug,
      title: p.title,
      difficulty: p.difficulty,
      tags: p.tags,
      is_premium: p.isPremium,
      url: p.url,
      active: true,
    }, { onConflict: "slug" });
    if (error) {
      failed++;
    } else {
      // 無法直接知道是 insert 還是 update、用 before/after 推算
      updated++;
    }
  }

  const after = await admin.from("leetcode_problems").select("id", { count: "exact", head: true });
  const afterCount = after.count ?? 0;
  inserted = afterCount - beforeCount;
  updated = problems.length - inserted - failed;

  return NextResponse.json({
    ok: true,
    fetched: problems.length,
    inserted,
    updated,
    failed,
    total_problems_now: afterCount,
  });
}
