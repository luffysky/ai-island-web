import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

// GET /api/blog/unsubscribe?token=xxx — 用 token 退訂
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: sub } = await admin
    .from("blog_subscribers")
    .select("id, email")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (!sub) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  await admin.from("blog_subscribers").delete().eq("id", sub.id);
  return NextResponse.json({ ok: true, email: sub.email });
}
