import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { runAutoSync } from "@/lib/kanban-auto-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * 雪鑰自動掃 launchpad — 對比 GitHub 最近 commits 跟 TODO/DOING 卡、自動移完成的到 DONE
 *
 * POST /api/admin/kanban/auto-sync  ← admin / cron 都能打
 *   admin 走 cookie auth、cron 走 ?secret=$CRON_SECRET
 *   實際工作在 @/lib/kanban-auto-sync 的 runAutoSync（cron route 也直接 import 呼叫）
 */

async function gate(req: NextRequest) {
  // 兩條認證路徑：cron secret OR admin cookie
  const cronSecret = req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-cron-secret");
  if (cronSecret && cronSecret === process.env.CRON_SECRET) return { ok: true as const };

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, body: { error: "unauthorized" } };
  const { data: p } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  if (!(p as any)?.is_owner && !["admin", "owner"].includes((p as any)?.role ?? "")) {
    return { ok: false as const, status: 403, body: { error: "forbidden" } };
  }
  return { ok: true as const };
}

export async function POST(req: NextRequest) {
  try {
    const g = await gate(req);
    if (!g.ok) return NextResponse.json(g.body, { status: g.status });
    return await runAutoSync();
  } catch (e: any) {
    console.error("[kanban/auto-sync] uncaught:", e?.stack || e?.message || e);
    return NextResponse.json({
      ok: false,
      error: e?.message ? `internal_error: ${String(e.message).slice(0, 200)}` : "internal_error",
    }, { status: 500 });
  }
}
