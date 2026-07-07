import { NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { setWorkShowcase, workWorkspace } from "@/lib/creator-engine/works";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { on?:boolean } → 發佈/取消 公開展示。 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const ws = await workWorkspace(id);
  if (!ws) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const gate = await requireWorkspaceRole(ws, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;

  const body = await req.json().catch(() => ({} as any));
  const on = body.on !== false;
  await setWorkShowcase(id, on);
  return NextResponse.json({ ok: true, on });
}
