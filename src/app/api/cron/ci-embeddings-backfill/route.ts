import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { backfillWorkspaceEmbeddings } from "@/lib/creator-engine/embeddings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Creator Island 碎片語意向量回填（#93）。
 * createFragment 不設 embedding、原本只在點「意外配對」時懶惰回填 → 沒點過的 workspace 語意搜尋/E4/E5 靜默空。
 * 本 cron 定期把所有缺向量的 ci_fragments 補齊（需 ai_api_keys 有 OpenAI key，否則 embedText 回 null、整批 no-op）。
 * cron-job.org 設每日一次打 ?secret=$CRON_SECRET。
 */
export async function GET(req: NextRequest) {
  const authErr = verifyCronAuth(req);
  if (authErr) return authErr;

  const admin = createSupabaseAdmin();
  const CAP = 400; // 每次 cron 最多回填 400 筆，避免超時（其餘留待下次）

  // 找出「還有缺向量碎片」的 workspace（去重）
  const { data, error } = await admin
    .from("ci_fragments")
    .select("workspace_id")
    .is("embedding", null)
    .limit(3000);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const wsIds = Array.from(new Set(((data as any[]) ?? []).map((r) => r.workspace_id).filter(Boolean)));
  if (wsIds.length === 0) return NextResponse.json({ ok: true, workspaces: 0, backfilled: 0, note: "無缺向量碎片" });

  let total = 0;
  const per: Record<string, number> = {};
  for (const ws of wsIds) {
    if (total >= CAP) break;
    const n = await backfillWorkspaceEmbeddings(ws, Math.min(100, CAP - total));
    per[ws] = n;
    total += n;
  }

  // total=0 且有缺向量 workspace → 多半是沒 OpenAI key（embedText 回 null）
  const noKeyLikely = total === 0 && wsIds.length > 0;
  return NextResponse.json({
    ok: true,
    workspaces_with_gaps: wsIds.length,
    backfilled: total,
    per,
    ...(noKeyLikely ? { warn: "回填 0：可能 ai_api_keys 沒有可用的 OpenAI key（embedText 回 null）" } : {}),
  });
}
