import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";

// GET /api/blog/series — 取自己的系列
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("blog_series")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ series: data });
}

// POST — 建立系列
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const title = (body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "title_required" }, { status: 400 });

  const { data, error } = await supabase
    .from("blog_series")
    .insert({
      user_id: user.id,
      title,
      description: body.description ?? null,
      cover_image: body.cover_image ?? null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ series: data });
}

// PATCH — 更新系列（?id=xxx）
export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const f of ["title", "description", "cover_image", "is_completed"]) {
    if (f in body) patch[f] = body[f];
  }

  const { data, error } = await supabase
    .from("blog_series")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ series: data });
}

// DELETE — 刪系列（?id=xxx）；文章的 series_id 會自動設 null
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("blog_series")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
