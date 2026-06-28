import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { createWorkflow, listWorkflows } from "@/lib/creator-engine/workflows";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?workspaceId → { workflows } */
export async function GET(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const workspaceId = req.nextUrl.searchParams.get("workspaceId") ?? "";
  if (!workspaceId) return NextResponse.json({ error: "validation" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "viewer");
  if (gate instanceof NextResponse) return gate;
  return NextResponse.json({ workflows: await listWorkflows(workspaceId) });
}

/** POST { workspaceId, title, steps[] } → { workflow }（錄製存檔）。 */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const body = await req.json().catch(() => ({} as any));
  const workspaceId = String(body.workspaceId ?? "");
  const title = String(body.title ?? "").trim();
  const steps = Array.isArray(body.steps) ? body.steps : [];
  if (!workspaceId || !title || !steps.length) return NextResponse.json({ error: "validation", message: "缺 title / steps" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;
  return NextResponse.json({ workflow: await createWorkflow(workspaceId, u.userId, title, steps) });
}
