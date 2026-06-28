import { NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { archiveWork, workWorkspace } from "@/lib/creator-engine/works";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST → 封存作品並回收成碎片（記 recycled_from）。{ recycled } */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const ws = await workWorkspace(id);
  if (!ws) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const gate = await requireWorkspaceRole(ws, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;
  const res = await archiveWork(id, u.userId);
  return NextResponse.json({ ok: true, ...res });
}
