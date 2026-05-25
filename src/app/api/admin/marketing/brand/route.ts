import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "owner"].includes((profile as any).role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as any));
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("brand_voice").upsert({
    id: 1,
    brand_name: String(body.brand_name ?? "AI 島").slice(0, 100),
    tagline: body.tagline ? String(body.tagline).slice(0, 200) : null,
    description: body.description ? String(body.description).slice(0, 2000) : null,
    voice_tone: body.voice_tone ? String(body.voice_tone).slice(0, 1500) : null,
    do_words: Array.isArray(body.do_words) ? body.do_words.slice(0, 30) : [],
    dont_words: Array.isArray(body.dont_words) ? body.dont_words.slice(0, 30) : [],
    signature: body.signature ? String(body.signature).slice(0, 200) : null,
    hashtag_pool: Array.isArray(body.hashtag_pool) ? body.hashtag_pool.slice(0, 30) : [],
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
