import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 後台 owner / admin 守門 — 回 user id（給 created_by）或 null
async function guard() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null as null, ok: false };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_owner")
    .eq("id", user.id)
    .maybeSingle();
  const ok = profile?.role === "admin" || (profile as any)?.is_owner === true;
  return { user, ok };
}

/**
 * GET /api/admin/idea-fragments?q=&tag=
 *   → { fragments: IdeaFragment[] }
 * 支援搜尋（title / content）+ 標籤篩選
 */
export async function GET(req: NextRequest) {
  const { ok } = await guard();
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const tag = req.nextUrl.searchParams.get("tag")?.trim() ?? "";

  const admin = createSupabaseAdmin();
  let query = admin.from("idea_fragments").select("*").order("created_at", { ascending: false }).limit(500);

  if (q) query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
  if (tag) query = query.contains("tags", [tag]);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fragments: data ?? [] });
}

/**
 * POST /api/admin/idea-fragments  { title, content?, tags?, mood?, category? }
 *   → { fragment }
 */
export async function POST(req: NextRequest) {
  const { user, ok } = await guard();
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({} as any));
  const title = String(body.title ?? "").trim().slice(0, 200);
  if (!title) return NextResponse.json({ error: "title_required" }, { status: 400 });

  const tags = Array.isArray(body.tags)
    ? body.tags.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 30)
    : [];

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("idea_fragments")
    .insert({
      created_by: user!.id,
      title,
      content: String(body.content ?? "").slice(0, 20000),
      tags,
      mood: body.mood ? String(body.mood).slice(0, 50) : null,
      category: body.category ? String(body.category).slice(0, 50) : null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fragment: data });
}
