import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { runAutoSync } from "@/lib/kanban-auto-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * 每天自動跑雪鑰掃 launchpad
 * 排程：每天 17:30 UTC（= 台灣 01:30 凌晨）
 * 直接呼叫 kanban auto-sync 的 worker（不 self-fetch 自己的 public URL、避免連線被切 500）
 */
export async function GET(req: NextRequest) {
  const authErr = verifyCronAuth(req);
  if (authErr) return authErr;
  try {
    return await runAutoSync();
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "auto_sync_failed" }, { status: 500 });
  }
}
