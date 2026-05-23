import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  if (!body.title || !body.slug) return NextResponse.json({ error: "title_slug_required" }, { status: 400 });

  const { error } = await supabase.from("portfolios").insert({
    user_id: user.id,
    slug: body.slug,
    title: body.title,
    description: body.description ?? null,
    cover_image: body.cover_image ?? null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    playground_ids: Array.isArray(body.playground_ids) ? body.playground_ids : [],
    is_public: !!body.is_public,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
