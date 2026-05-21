import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { resolveBlog } from "@/lib/blog-resolve";

// POST /api/blog/[userSlug]/subscribe — 訂閱某個部落格
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userSlug: string }> }
) {
  const { userSlug } = await params;
  const blog = await resolveBlog(userSlug);
  if (!blog) return NextResponse.json({ error: "blog_not_found" }, { status: 404 });

  const body = await req.json();
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  // 已訂閱？
  const { data: existing } = await admin
    .from("blog_subscribers")
    .select("id")
    .eq("blog_user_id", blog.settings.user_id)
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, already: true });
  }

  const { error } = await admin
    .from("blog_subscribers")
    .insert({
      blog_user_id: blog.settings.user_id,
      email,
      name: body.name ?? null,
      is_verified: true,   // 簡化版直接視為已驗證（之後可加 email 驗證流程）
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
