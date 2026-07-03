/**
 * 創作引擎草稿的 Yjs CRDT 快照持久化端點（即時共編用）。
 *  - GET  → { ydoc: string | null }   載入 base64 快照（房間冷開 / 晚進場追平）
 *  - POST { ydoc: base64 } → { ok }    存 debounced 的 Y.encodeStateAsUpdate 快照
 *
 * 隔離：獨立於既有 drafts/[id]/route.ts（PATCH 仍負責 body/HTML autosave），
 * 不動到單人編輯路徑。權限沿用 workspace 成員檢查（GET=viewer、POST=contributor）。
 */
import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { getDraft } from "@/lib/creator-engine/drafts";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard(id: string, userId: string, min: "viewer" | "contributor") {
  const draft = await getDraft(id);
  if (!draft) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  const gate = await requireWorkspaceRole(draft.workspace_id, userId, min);
  if (gate instanceof NextResponse) return { error: gate };
  return { draft };
}

/** GET → { ydoc }：載入持久化 CRDT 快照（base64 或 null）。 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const g = await guard(id, u.userId, "viewer");
  if (g.error) return g.error;

  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_drafts").select("ydoc").eq("id", id).maybeSingle();
  return NextResponse.json({ ydoc: (data as { ydoc?: string | null })?.ydoc ?? null });
}

/** POST { ydoc: base64 } → { ok }：存快照（debounced 由前端呼叫）。 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const g = await guard(id, u.userId, "contributor");
  if (g.error) return g.error;

  const body = await req.json().catch(() => ({} as { ydoc?: unknown }));
  const ydoc = body?.ydoc;
  if (typeof ydoc !== "string" || ydoc.length === 0) {
    return NextResponse.json({ error: "validation", message: "缺 ydoc（base64）" }, { status: 422 });
  }
  // 上限保護：base64 過大直接拒（~6MB 原始 → ~8MB base64）
  if (ydoc.length > 8_000_000) {
    return NextResponse.json({ error: "too_large", message: "快照過大" }, { status: 413 });
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("ci_drafts")
    .update({ ydoc, ydoc_updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
