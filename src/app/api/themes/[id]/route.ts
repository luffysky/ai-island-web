import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { themeDefinitionSchema, analyzeTheme } from "@/lib/theme/engine";

export const dynamic = "force-dynamic";

// PATCH /api/themes/[id] — 更新 name / definition / is_favorite。
// definition 變動時重新 validate + analyze。RLS 自然把範圍限縮在本人。
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);

  const patch: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.is_favorite === "boolean") patch.is_favorite = body.is_favorite;

  if ("definition" in body) {
    const parsed = themeDefinitionSchema.safeParse(body.definition);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_definition", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    patch.definition = parsed.data;
    patch.a11y_report = analyzeTheme(parsed.data);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }
  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("themes")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select("id,name,definition,source,a11y_report,is_favorite,updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ theme: data });
}

// DELETE /api/themes/[id] — 軟刪除（deleted_at = now）。
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const { error } = await supabase
    .from("themes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
