import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { seedFromPool, seedSampleWorks } from "@/lib/creator-engine/workspace";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { workspaceId } → 從碎片庫種 300 顆（碎片很少時才允許，避免重複灌）。 */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  const workspaceId = String(b.workspaceId ?? "");
  if (!workspaceId) return NextResponse.json({ error: "validation" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;

  const admin = createSupabaseAdmin();
  const { count } = await admin.from("ci_fragments").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId);
  if ((count ?? 0) > 250) return NextResponse.json({ skipped: true, message: "你的碎片已經夠多了" });
  const added = await seedFromPool(workspaceId, u.userId, 300);
  const { count: wc } = await admin.from("ci_works").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId);
  if ((wc ?? 0) === 0) await seedSampleWorks(workspaceId, u.userId).catch(() => {});
  return NextResponse.json({ added });
}
