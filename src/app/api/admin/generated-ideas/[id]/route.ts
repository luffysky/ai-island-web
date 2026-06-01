import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  return profile?.role === "admin" || (profile as any)?.is_owner === true;
}

/** PATCH /api/admin/generated-ideas/[id]  { saved?: boolean, feedback?: "up"|"down"|null } */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await guard())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({} as any));

  const patch: Record<string, any> = {};
  if (typeof body.saved === "boolean") patch.saved = body.saved;
  if ("feedback" in body) {
    if (body.feedback === "up" || body.feedback === "down" || body.feedback === null) patch.feedback = body.feedback;
    else return NextResponse.json({ error: "bad_feedback" }, { status: 400 });
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("generated_ideas").update(patch).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ idea: data });
}

/** DELETE /api/admin/generated-ideas/[id] */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await guard())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("generated_ideas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
