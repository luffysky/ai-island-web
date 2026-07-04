import { NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { getCoachAdvice } from "@/lib/creator-engine/growth";
import { getActiveWorkspace } from "@/lib/creator-engine/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** POST → { advice } 產生本週 AI 教練建議。 */
export async function POST() {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const ws = await getActiveWorkspace(u.userId);
  const r = await getCoachAdvice(u.userId, ws.id);
  if ("error" in r) return NextResponse.json({ error: r.error, message: r.error === "samples_too_few" ? "先多寫幾個碎片/作品，教練才有東西可以看" : "產生失敗" }, { status: 422 });
  return NextResponse.json({ advice: r.advice });
}
