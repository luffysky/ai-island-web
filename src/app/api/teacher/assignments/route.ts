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
  return { ok: true as const, userId: user.id };
}

export async function POST(req: NextRequest) {
  const a = await assertTeacher();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const body = await req.json().catch(() => ({} as any));
  if (!body.title || !body.description_md) return NextResponse.json({ error: "title_body_required" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("assignments").insert({
    title: body.title,
    description_md: body.description_md,
    chapter_id: body.chapter_id ?? null,
    lesson_id: body.lesson_id ?? null,
    max_score: body.max_score ?? 100,
    due_date: body.due_date ?? null,
    is_required: !!body.is_required,
    created_by: a.userId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
