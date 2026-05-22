import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";

const ALLOWED_SPECIES = new Set(["hamster", "cat", "dog", "rabbit"]);

/**
 * POST /api/pet/settings
 * 更新自己的寵物設定（name / species / proactive_enabled / walk_enabled）。
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };

  if (typeof body.name === "string") {
    const trimmed = body.name.trim().slice(0, 30);
    if (trimmed.length === 0) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }
    patch.name = trimmed;
  }
  if (typeof body.species === "string") {
    if (!ALLOWED_SPECIES.has(body.species)) {
      return NextResponse.json({ error: "bad_species" }, { status: 400 });
    }
    patch.species = body.species;
  }
  if (typeof body.proactive_enabled === "boolean") {
    patch.proactive_enabled = body.proactive_enabled;
  }
  if (typeof body.walk_enabled === "boolean") {
    patch.walk_enabled = body.walk_enabled;
  }

  const admin = createSupabaseAdmin();
  // 用 service_role 寫、避免 profile 欄位 trigger（pets 表沒有 trigger、這裡其實 own update 也行、但跨表保守起見）
  const { data, error } = await admin
    .from("pets")
    .update(patch)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) {
    // 從沒 load 過、先建
    const { data: created, error: insErr } = await admin
      .from("pets")
      .insert({ user_id: user.id, ...patch })
      .select("*")
      .single();
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, pet: created });
  }
  return NextResponse.json({ ok: true, pet: data });
}
