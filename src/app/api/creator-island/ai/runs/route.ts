import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?workspaceId&cursor&limit → { items, nextCursor } AI 執行紀錄。 */
export async function GET(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get("workspaceId") ?? "";
  if (!workspaceId) return NextResponse.json({ error: "validation", message: "缺 workspaceId" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "viewer");
  if (gate instanceof NextResponse) return gate;

  const limit = Math.max(1, Math.min(100, Number(sp.get("limit")) || 20));
  const admin = createSupabaseAdmin();
  let q = admin.from("ci_agent_runs")
    .select("id, agent_type, model, provider, tokens_input, tokens_output, cost_usd, z_charged, status, created_at")
    .eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(limit + 1);
  const cursor = sp.get("cursor");
  if (cursor) q = q.lt("created_at", cursor);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data as any[]) ?? [];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return NextResponse.json({ items, nextCursor: hasMore ? items[items.length - 1].created_at : null });
}
