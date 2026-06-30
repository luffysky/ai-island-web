import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin as adminGate } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard() {
  const gate = await adminGate();
  return { user: gate.ok ? { id: gate.userId } : (null as null), ok: gate.ok };
}

/**
 * PATCH /api/admin/idea-fragments/[id]  { title?, content?, tags?, mood?, category? }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await guard()).ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({} as any));

  const patch: Record<string, any> = {};
  if (typeof body.title === "string") {
    const t = body.title.trim().slice(0, 200);
    if (!t) return NextResponse.json({ error: "title_required" }, { status: 400 });
    patch.title = t;
  }
  if (typeof body.content === "string") patch.content = body.content.slice(0, 20000);
  if (Array.isArray(body.tags)) patch.tags = body.tags.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 30);
  if ("mood" in body) patch.mood = body.mood ? String(body.mood).slice(0, 50) : null;
  if ("category" in body) patch.category = body.category ? String(body.category).slice(0, 50) : null;
  if ("folderId" in body) patch.folder_id = body.folderId ? String(body.folderId) : null;

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("idea_fragments").update(patch).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fragment: data });
}

/**
 * DELETE /api/admin/idea-fragments/[id]
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await guard()).ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("idea_fragments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
