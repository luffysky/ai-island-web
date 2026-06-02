import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function assertAdmin() {
  const gate = await requireStaff(["admin", "editor"]);
  if (!gate.ok) return { error: gate.status === 401 ? ("unauthorized" as const) : ("forbidden" as const), status: gate.status };
  return { ok: true as const, userId: gate.userId };
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
