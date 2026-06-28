import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { listWorkspaces, createStudioWorkspace } from "@/lib/creator-engine/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET → { workspaces } */
export async function GET() {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const workspaces = await listWorkspaces(u.userId);
  return NextResponse.json({ workspaces });
}

/** POST { name } → { workspace } 建立 Studio workspace */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const body = await req.json().catch(() => ({} as any));
  const name = String(body.name ?? "").trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: "validation", message: "請輸入工作室名稱" }, { status: 422 });
  const workspace = await createStudioWorkspace(u.userId, name);
  return NextResponse.json({ workspace });
}
