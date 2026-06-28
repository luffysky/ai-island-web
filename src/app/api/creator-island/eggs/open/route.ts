import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { openEgg } from "@/lib/creator-engine/dust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { workspaceId } → { fragment, balance } 開碎片蛋（扣 1 Dust）。 */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const body = await req.json().catch(() => ({} as any));
  const workspaceId = String(body.workspaceId ?? "");
  if (!workspaceId) return NextResponse.json({ error: "validation", message: "缺 workspaceId" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;
  const r = await openEgg(workspaceId, u.userId);
  if (!r.ok) return NextResponse.json({ error: r.error, message: "Dust 不足（每日會自動補充）" }, { status: 402 });
  return NextResponse.json({ fragment: r.fragment, balance: r.balance });
}
