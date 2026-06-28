import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { getFragmentsByIds, createFragment } from "@/lib/creator-engine/fragments";
import { transcreate, AgentError } from "@/lib/creator-engine/ai/agents";
import { addRelation } from "@/lib/creator-engine/lineage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { workspaceId, fragmentId, targetLanguage, targetCulture } → { fragment, note }
 *  轉譯來源碎片 → 存成新碎片(source_type=transcreated) + 記 transcreated_from 家譜。 */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const body = await req.json().catch(() => ({} as any));
  const workspaceId = String(body.workspaceId ?? "");
  const fragmentId = String(body.fragmentId ?? "");
  const targetLanguage = String(body.targetLanguage ?? "").trim();
  const targetCulture = String(body.targetCulture ?? "").trim();
  if (!workspaceId || !fragmentId || !targetLanguage) return NextResponse.json({ error: "validation", message: "缺參數" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;

  const [src] = await getFragmentsByIds(workspaceId, [fragmentId]);
  if (!src) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const { result } = await transcreate(workspaceId, u.userId, `${src.title}\n${src.content}`, targetLanguage, targetCulture || "自然在地");
    const fragment = await createFragment(workspaceId, u.userId, {
      title: `${src.title}（${targetLanguage}）`, content: result.output, tags: ["轉譯", targetLanguage], sourceType: "transcreated",
    });
    await addRelation(workspaceId, { id: fragment.id, type: "fragment" }, { id: src.id, type: "fragment" }, "transcreated_from").catch(() => {});
    return NextResponse.json({ fragment, note: result.note });
  } catch (e) {
    const st = e instanceof AgentError ? e.status : 500;
    return NextResponse.json({ error: "ai", message: (e as Error).message }, { status: st });
  }
}
