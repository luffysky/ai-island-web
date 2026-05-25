import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PLATFORMS = new Set(["meta", "google", "tiktok", "line_ads"]);
const STATUSES = new Set(["draft", "ready", "running", "paused", "completed", "archived"]);

async function guard() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "owner"].includes((profile as any).role)) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function POST(req: NextRequest) {
  const g = await guard();
  if ("error" in g) return g.error;
  const body = await req.json().catch(() => ({} as any));
  if (!PLATFORMS.has(body.platform)) {
    return NextResponse.json({ error: "platform 須是 meta/google/tiktok/line_ads" }, { status: 400 });
  }
  if (!body.campaign_name || String(body.campaign_name).trim().length === 0) {
    return NextResponse.json({ error: "campaign_name 必填" }, { status: 400 });
  }
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("ad_creatives")
    .insert({
      platform: body.platform,
      campaign_name: String(body.campaign_name).slice(0, 200),
      goal: body.goal ? String(body.goal).slice(0, 50) : null,
      audience: body.audience ? String(body.audience).slice(0, 500) : null,
      headlines: Array.isArray(body.headlines) ? body.headlines.slice(0, 10).map(String) : [],
      primary_text: body.primary_text ? String(body.primary_text).slice(0, 2000) : null,
      descriptions: Array.isArray(body.descriptions) ? body.descriptions.slice(0, 10).map(String) : [],
      cta: body.cta ? String(body.cta).slice(0, 50) : null,
      landing_url: body.landing_url ? String(body.landing_url).slice(0, 500) : null,
      budget_ntd: body.budget_ntd ? Number(body.budget_ntd) : null,
      status: STATUSES.has(body.status) ? body.status : "draft",
      created_by: g.user.id,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: (data as any).id });
}

export async function PATCH(req: NextRequest) {
  const g = await guard();
  if ("error" in g) return g.error;
  const body = await req.json().catch(() => ({} as any));
  if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const patch: any = { updated_at: new Date().toISOString() };
  if (body.campaign_name !== undefined) patch.campaign_name = String(body.campaign_name).slice(0, 200);
  if (body.goal !== undefined) patch.goal = body.goal ? String(body.goal).slice(0, 50) : null;
  if (body.audience !== undefined) patch.audience = body.audience ? String(body.audience).slice(0, 500) : null;
  if (body.headlines !== undefined) patch.headlines = Array.isArray(body.headlines) ? body.headlines.slice(0, 10).map(String) : [];
  if (body.primary_text !== undefined) patch.primary_text = body.primary_text ? String(body.primary_text).slice(0, 2000) : null;
  if (body.descriptions !== undefined) patch.descriptions = Array.isArray(body.descriptions) ? body.descriptions.slice(0, 10).map(String) : [];
  if (body.cta !== undefined) patch.cta = body.cta ? String(body.cta).slice(0, 50) : null;
  if (body.landing_url !== undefined) patch.landing_url = body.landing_url ? String(body.landing_url).slice(0, 500) : null;
  if (body.budget_ntd !== undefined) patch.budget_ntd = body.budget_ntd ? Number(body.budget_ntd) : null;
  if (body.status !== undefined && STATUSES.has(body.status)) patch.status = body.status;
  if (body.platform !== undefined && PLATFORMS.has(body.platform)) patch.platform = body.platform;
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("ad_creatives").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const g = await guard();
  if ("error" in g) return g.error;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("ad_creatives").update({ status: "archived" }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
