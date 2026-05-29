import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * 每天自動跑雪鑰掃 launchpad
 * 排程：每天 17:30 UTC（= 台灣 01:30 凌晨）
 * 內部 proxy 到 /api/admin/kanban/auto-sync?secret=...
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const got = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (!expected || got !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 內部 proxy（重用 admin/kanban/auto-sync 邏輯、cron secret 認證）
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";
  try {
    const res = await fetch(`${site}/api/admin/kanban/auto-sync?secret=${encodeURIComponent(expected)}`, {
      method: "POST",
      headers: { "x-cron-secret": expected },
      signal: AbortSignal.timeout(120_000),
    });
    const j = await res.json();
    return NextResponse.json(j);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "proxy_failed" }, { status: 500 });
  }
}
