import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";

// 只有 admin 才看得到（防止 brute force ADMIN_SLUG）
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (p?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const slug = process.env.ADMIN_SLUG;
  const publicSlug = process.env.NEXT_PUBLIC_ADMIN_SLUG;

  return NextResponse.json({
    server_slug_set: !!slug,
    public_slug_set: !!publicSlug,
    slugs_match: slug === publicSlug,
    server_slug_length: slug?.length ?? 0,
    // 只給 admin 看完整 slug
    server_slug: slug ?? null,
    public_slug: publicSlug ?? null,
  });
}
