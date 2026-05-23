import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function assertAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const, status: 401 };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") return { error: "forbidden" as const, status: 403 };
  return { ok: true as const, userId: user.id };
}

export async function POST(req: NextRequest) {
  const a = await assertAdmin();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const body = await req.json().catch(() => ({} as any));
  if (!body.title || !body.body_md) return NextResponse.json({ error: "title_body_required" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("changelog_entries").insert({
    version: body.version ?? null,
    title: body.title,
    body_md: body.body_md,
    tags: Array.isArray(body.tags) ? body.tags : [],
    published: !!body.published,
    author_id: a.userId,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
