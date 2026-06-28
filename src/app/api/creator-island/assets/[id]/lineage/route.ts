import { NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { getLineage } from "@/lib/creator-engine/lineage";
import { getWorkspaceRole, roleAtLeast } from "@/lib/creator-engine/workspace";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET → { outgoing, incoming } 某資產的衍生關係（任一邊的 workspace 成員可看）。 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const lineage = await getLineage(id);

  // 權限：用任一條邊的 workspace 驗成員
  const ws = [...lineage.outgoing, ...lineage.incoming][0]?.workspace_id as string | undefined;
  if (ws) {
    const role = await getWorkspaceRole(ws, u.userId);
    if (!roleAtLeast(role, "viewer")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  } else {
    // 沒有任何邊：確認此 asset 屬於使用者可見 workspace（碎片/作品）
    const admin = createSupabaseAdmin();
    const { data: frag } = await admin.from("ci_fragments").select("workspace_id").eq("id", id).maybeSingle();
    const { data: work } = frag ? { data: null } : await admin.from("ci_works").select("workspace_id").eq("id", id).maybeSingle();
    const owId = (frag as any)?.workspace_id ?? (work as any)?.workspace_id;
    if (owId) {
      const role = await getWorkspaceRole(owId, u.userId);
      if (!roleAtLeast(role, "viewer")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }
  return NextResponse.json(lineage);
}
