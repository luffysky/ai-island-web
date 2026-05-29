import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function gateAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, body: { error: "unauthorized" } };
  const { data: p } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  if (!(p as any)?.is_owner && !["admin", "owner"].includes((p as any)?.role ?? "")) {
    return { ok: false as const, status: 403, body: { error: "forbidden" } };
  }
  return { ok: true as const, userId: user.id };
}

/** PATCH — 編輯 card 或移動 column / 改 position（drag/drop 都打這） */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await gateAdmin();
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({} as any));

  const update: any = {};
  if (typeof body.title === "string") update.title = body.title.slice(0, 200);
  if (typeof body.description === "string") update.description = body.description.slice(0, 4000);
  if (typeof body.category === "string") update.category = body.category.slice(0, 50);
  if (Array.isArray(body.labels)) update.labels = body.labels.slice(0, 20).map((l: any) => String(l).slice(0, 50));
  if (typeof body.column_id === "string") update.column_id = body.column_id;
  if (typeof body.position === "number") update.position = body.position;
  if (body.meta && typeof body.meta === "object") update.meta = body.meta;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no_fields_to_update" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("admin_kanban_cards").update(update).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, card: data });
}

/** DELETE — 刪 card */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await gateAdmin();
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const { id } = await ctx.params;
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("admin_kanban_cards").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
