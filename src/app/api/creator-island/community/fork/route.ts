import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { forkAsset } from "@/lib/creator-engine/community";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { assetId, assetType, toWorkspaceId, remix? } → { asset } 把公開資產 fork/remix 進自己 workspace。 */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  const toWorkspaceId = String(b.toWorkspaceId ?? "");
  if (!b.assetId || !b.assetType || !toWorkspaceId) return NextResponse.json({ error: "validation", message: "缺欄位" }, { status: 422 });
  const gate = await requireWorkspaceRole(toWorkspaceId, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;
  try {
    const asset = await forkAsset(String(b.assetId), b.assetType, toWorkspaceId, u.userId, !!b.remix);
    return NextResponse.json({ asset });
  } catch (e) {
    return NextResponse.json({ error: "fork_failed", message: (e as Error).message }, { status: 400 });
  }
}
