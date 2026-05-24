import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function assertStaff() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const, status: 401 };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "teacher", "assistant"].includes(profile?.role ?? "")) {
    return { error: "forbidden" as const, status: 403 };
  }
  return { ok: true as const, userId: user.id };
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const a = await assertStaff();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({} as any));
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.title) patch.title = String(body.title).slice(0, 100);
  if (body.body) patch.body = String(body.body).slice(0, 5000);
  if ("category" in body) patch.category = body.category ? String(body.category).slice(0, 40) : null;
  if ("shortcut" in body) patch.shortcut = body.shortcut ? String(body.shortcut).slice(0, 40) : null;
  if ("use_count_increment" in body) {
    // 用一次 = 自動 increment
    const admin = createSupabaseAdmin();
    const { data: row } = await admin.from("canned_replies").select("use_count").eq("id", id).single();
    patch.use_count = ((row as any)?.use_count ?? 0) + 1;
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("canned_replies").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const a = await assertStaff();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const { id } = await ctx.params;

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("canned_replies").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
