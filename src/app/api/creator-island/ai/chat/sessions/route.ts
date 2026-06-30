import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?workspaceId → { items:[{id,title,updated_at}] } 近 30 筆 */
export async function GET(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const workspaceId = req.nextUrl.searchParams.get("workspaceId") ?? "";
  if (!workspaceId) return NextResponse.json({ error: "validation" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "viewer");
  if (gate instanceof NextResponse) return gate;
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_chat_sessions")
    .select("id, title, updated_at").eq("workspace_id", workspaceId).eq("user_id", u.userId)
    .order("updated_at", { ascending: false }).limit(30);
  return NextResponse.json({ items: data ?? [] });
}

/** POST { workspaceId, sessionId?, messages, title? } → { id } 建立或更新一段對話 */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  const workspaceId = String(b.workspaceId ?? "");
  if (!workspaceId || !Array.isArray(b.messages)) return NextResponse.json({ error: "validation" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;

  const messages = b.messages.slice(-100);
  const firstUser = messages.find((m: any) => m.role === "user");
  const title = String(b.title || firstUser?.content || "新對話").slice(0, 80);
  const admin = createSupabaseAdmin();

  if (b.sessionId) {
    // 只能更新自己的 session
    const { data } = await admin.from("ci_chat_sessions")
      .update({ messages, title, updated_at: new Date().toISOString() })
      .eq("id", b.sessionId).eq("user_id", u.userId).select("id").maybeSingle();
    if (data) return NextResponse.json({ id: (data as any).id });
  }
  const { data, error } = await admin.from("ci_chat_sessions")
    .insert({ workspace_id: workspaceId, user_id: u.userId, title, messages }).select("id").single();
  if (error) return NextResponse.json({ error: "db", message: error.message }, { status: 500 });
  return NextResponse.json({ id: (data as any).id });
}
