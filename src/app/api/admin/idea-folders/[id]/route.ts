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

/** PATCH { name?, color? } — 改名 / 換色 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await guard())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({} as any));
  const patch: Record<string, any> = {};
  if (typeof body.name === "string") {
    const n = body.name.trim().slice(0, 60);
    if (!n) return NextResponse.json({ error: "name_required" }, { status: 400 });
    patch.name = n;
  }
  if ("color" in body) patch.color = body.color ? String(body.color).slice(0, 20) : null;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("idea_folders").update(patch).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ folder: data });
}

/** DELETE — 刪資料夾（碎片不刪、folder_id 自動設 NULL → 變未分類） */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await guard())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("idea_folders").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
