import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { searchFragmentsByQuery } from "@/lib/creator-engine/embeddings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST { workspaceId, query, count? } → { matches, semantic }
 * 「綠寶找碎片來寫歌」：用主題/文字語意搜尋 workspace 的碎片。
 * 語意搜尋不可用時（無 embedding key）回空 + semantic:false，前端 fallback 純文字搜尋。
 */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  const workspaceId = String(b.workspaceId ?? "");
  const query = String(b.query ?? "").slice(0, 500);
  const count = Math.min(20, Math.max(1, Number(b.count) || 8));
  if (!workspaceId || !query.trim()) {
    return NextResponse.json({ error: "validation", message: "缺 workspaceId / query" }, { status: 422 });
  }
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "viewer");
  if (gate instanceof NextResponse) return gate;

  const matches = await searchFragmentsByQuery(workspaceId, query, count);
  return NextResponse.json({ matches, semantic: matches.length > 0 });
}
