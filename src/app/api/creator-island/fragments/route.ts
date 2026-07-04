import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { listFragments, createFragment } from "@/lib/creator-engine/fragments";
import { addRelation, type RelationType } from "@/lib/creator-engine/lineage";
import { bumpCreatorXp } from "@/lib/creator-engine/growth";

// 碎片衍生自碎片時允許的血緣關係（#2：防家譜空掉）。
const FRAG_RELATIONS: RelationType[] = ["condensed_from", "evolved_from", "transcreated_from", "inspired_by", "remixed_from", "forked_from"];

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?workspaceId&cursor&q&tag&limit → { items, nextCursor } */
export async function GET(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get("workspaceId") ?? "";
  if (!workspaceId) return NextResponse.json({ error: "validation", message: "缺 workspaceId" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "viewer");
  if (gate instanceof NextResponse) return gate;
  const res = await listFragments(workspaceId, {
    cursor: sp.get("cursor"),
    q: sp.get("q"),
    tag: sp.get("tag"),
    limit: Number(sp.get("limit")) || 20,
  });
  return NextResponse.json(res);
}

/** POST { workspaceId, title, content?, tags?, sourceType? } → { fragment } */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const body = await req.json().catch(() => ({} as any));
  const workspaceId = String(body.workspaceId ?? "");
  const title = String(body.title ?? "").trim();
  if (!workspaceId || !title) return NextResponse.json({ error: "validation", message: "缺 workspaceId / title" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;
  const fragment = await createFragment(workspaceId, u.userId, {
    title,
    content: body.content,
    tags: Array.isArray(body.tags) ? body.tags : undefined,
    sourceType: body.sourceType,
  });
  // #2 血緣：AI 衍生（凝聚/演化…）帶來源 → 寫 ci_asset_relations，家譜才看得到來源。
  const derivedFrom: string[] = Array.isArray(body.derivedFrom) ? body.derivedFrom.filter((x: any) => typeof x === "string") : [];
  const relationType = body.relationType as RelationType | undefined;
  if (derivedFrom.length && relationType && FRAG_RELATIONS.includes(relationType)) {
    await Promise.all(
      derivedFrom.slice(0, 50).map((srcId) =>
        addRelation(workspaceId, { id: fragment.id, type: "fragment" }, { id: srcId, type: "fragment" }, relationType).catch(() => {}),
      ),
    );
  }
  // #91 Creator XP：真創作(人工/AI 協作)才給，egg/匯入不給
  if (!body.sourceType || ["human_original", "ai_assisted"].includes(body.sourceType)) void bumpCreatorXp(u.userId, 3);
  return NextResponse.json({ fragment });
}
