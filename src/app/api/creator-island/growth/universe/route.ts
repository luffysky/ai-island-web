import { NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { getUniverse, computeUniverse } from "@/lib/creator-engine/fie/universe";
import { getActiveWorkspace } from "@/lib/creator-engine/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** GET → { stats, report, generatedAt } */
export async function GET() {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  return NextResponse.json(await getUniverse(u.userId));
}

/** POST → 重算宇宙洞察。{ report, stats } 或 { error }。 */
export async function POST() {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const ws = await getActiveWorkspace(u.userId);
  const r = await computeUniverse(u.userId, ws.id);
  if ("error" in r) {
    return NextResponse.json({ error: r.error, message: r.error === "samples_too_few" ? "碎片還太少，多收集一些（至少 8 個）再來看你的宇宙。" : "生成失敗，稍後再試" }, { status: 422 });
  }
  return NextResponse.json(r);
}
