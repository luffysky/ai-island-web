import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { listMemory, createMemory, type MemoryScope } from "@/lib/creator-engine/memory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SCOPES: MemoryScope[] = ["personal", "workspace", "project", "session"];

/** GET ?scope&workspaceId → { memories } */
export async function GET(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const sp = req.nextUrl.searchParams;
  const scope = (sp.get("scope") ?? "personal") as MemoryScope;
  if (!SCOPES.includes(scope)) return NextResponse.json({ error: "validation" }, { status: 422 });
  const workspaceId = sp.get("workspaceId") ?? undefined;
  if (scope !== "personal") {
    if (!workspaceId) return NextResponse.json({ error: "validation", message: "缺 workspaceId" }, { status: 422 });
    const gate = await requireWorkspaceRole(workspaceId, u.userId, "viewer");
    if (gate instanceof NextResponse) return gate;
  }
  const memories = await listMemory(scope, { userId: u.userId, workspaceId });
  return NextResponse.json({ memories });
}

/** POST { scope, workspaceId?, kind?, text } → { memory } */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const body = await req.json().catch(() => ({} as any));
  const scope = (body.scope ?? "personal") as MemoryScope;
  const text = String(body.text ?? "").trim();
  if (!SCOPES.includes(scope) || !text) return NextResponse.json({ error: "validation", message: "缺 scope / text" }, { status: 422 });
  if (scope !== "personal") {
    const gate = await requireWorkspaceRole(String(body.workspaceId ?? ""), u.userId, "contributor");
    if (gate instanceof NextResponse) return gate;
  }
  const memory = await createMemory({ scope, userId: u.userId, workspaceId: body.workspaceId, kind: body.kind, text });
  return NextResponse.json({ memory });
}
