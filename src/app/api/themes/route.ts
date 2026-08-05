import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { themeDefinitionSchema, analyzeTheme } from "@/lib/theme/engine";

export const dynamic = "force-dynamic";

// GET /api/themes — 目前使用者的主題（最近 60 筆）。
export async function GET() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("themes")
    .select("id,name,definition,source,a11y_report,is_favorite,updated_at")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(60);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ themes: data ?? [] });
}

// POST /api/themes — 建立一個主題。
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "未命名主題";
  const source = typeof body.source === "string" ? body.source : "manual";

  const parsed = themeDefinitionSchema.safeParse(body.definition);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_definition", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const definition = parsed.data;
  const a11y_report = analyzeTheme(definition);

  const { data, error } = await supabase
    .from("themes")
    .insert({
      user_id: user.id,
      name,
      definition,
      source,
      a11y_report,
    })
    .select("id,name,definition,source,a11y_report,is_favorite,updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ theme: data }, { status: 201 });
}
