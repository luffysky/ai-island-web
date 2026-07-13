import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 把結構化欄位組成一段給 AI 工具直接用的自我描述
function composeAbout(p: { identity?: string; assets?: string; stage?: string; interests?: string[] }): string {
  const parts: string[] = [];
  if (p.identity) parts.push(`我是${p.identity}`);
  if (p.assets) parts.push(`我有：${p.assets}`);
  if (p.stage) parts.push(`目前完成度：${p.stage}`);
  if (p.interests?.length) parts.push(`想參加：${p.interests.join("、")}`);
  return parts.join("。") + (parts.length ? "。" : "");
}

// GET /api/opportunities/profile — 我的機會檔案
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("opportunity_profiles").select("*").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ profile: data ?? null });
}

// PUT /api/opportunities/profile — 建立/更新
export async function PUT(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));

  const identity = String(body.identity ?? "").trim().slice(0, 120) || null;
  const assets = String(body.assets ?? "").trim().slice(0, 600) || null;
  const stage = String(body.stage ?? "").trim().slice(0, 120) || null;
  const interests = Array.isArray(body.interests) ? body.interests.map((x: any) => String(x).slice(0, 40)).slice(0, 12) : [];
  // about：使用者有自己寫就用他的，否則自動組
  const about = (String(body.about ?? "").trim().slice(0, 1200)) || composeAbout({ identity: identity ?? undefined, assets: assets ?? undefined, stage: stage ?? undefined, interests }) || null;

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("opportunity_profiles")
    .upsert({ user_id: user.id, identity, assets, stage, interests, about, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
