import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function assertTeacher() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const, status: 401 };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["owner", "admin", "teacher", "editor"].includes(profile?.role ?? "")) return { error: "forbidden" as const, status: 403 };
  return { ok: true as const };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await assertTeacher();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const { id } = await params;
  const body = await req.json().catch(() => ({} as any));
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const k of ["title", "description_md", "chapter_id", "lesson_id", "max_score", "due_date", "is_required"]) {
    if (k in body) patch[k] = body[k];
  }
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("assignments").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await assertTeacher();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("assignments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
