import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard(_req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.response };
  return { user: { id: gate.userId } };
}

// 列草稿 / 已排程
export async function GET(req: NextRequest) {
  const g = await guard(req);
  if ("error" in g) return g.error;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const admin = createSupabaseAdmin();
  let q = admin
    .from("marketing_drafts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drafts: data ?? [] });
}

// 建草稿
export async function POST(req: NextRequest) {
  const g = await guard(req);
  if ("error" in g) return g.error;

  const body = await req.json().catch(() => ({} as any));
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("marketing_drafts")
    .insert({
      title: String(body.title ?? "(無標題)").slice(0, 200),
      topic: body.topic ? String(body.topic).slice(0, 500) : null,
      platforms: Array.isArray(body.platforms) ? body.platforms : [],
      contents: body.contents ?? {},
      media_urls: Array.isArray(body.media_urls) ? body.media_urls : [],
      hashtags: Array.isArray(body.hashtags) ? body.hashtags : [],
      status: body.scheduled_at ? "scheduled" : "draft",
      scheduled_at: body.scheduled_at ?? null,
      utm_campaign: body.utm_campaign ?? null,
      created_by: g.user.id,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: (data as any).id });
}

// 更新 / 排程 / 改 status
export async function PATCH(req: NextRequest) {
  const g = await guard(req);
  if ("error" in g) return g.error;

  const body = await req.json().catch(() => ({} as any));
  if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const patch: any = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) patch.title = String(body.title).slice(0, 200);
  if (body.contents !== undefined) patch.contents = body.contents;
  if (body.platforms !== undefined) patch.platforms = body.platforms;
  if (body.hashtags !== undefined) patch.hashtags = body.hashtags;
  if (body.media_urls !== undefined) patch.media_urls = body.media_urls;
  if (body.scheduled_at !== undefined) patch.scheduled_at = body.scheduled_at;
  if (body.status !== undefined) patch.status = body.status;
  const { error } = await admin.from("marketing_drafts").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// 刪 (archive)
export async function DELETE(req: NextRequest) {
  const g = await guard(req);
  if ("error" in g) return g.error;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("marketing_drafts").update({ status: "archived" }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
