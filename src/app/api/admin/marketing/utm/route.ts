import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { err: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "owner"].includes((profile as any).role)) {
    return { err: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function POST(req: NextRequest) {
  const g = await guard();
  if ("err" in g) return g.err;

  const body = await req.json().catch(() => ({} as any));
  const code = String(body.short_code ?? "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!code || code.length < 3) return NextResponse.json({ error: "short_code 至少 3 個英數" }, { status: 400 });
  if (!body.dest_url) return NextResponse.json({ error: "dest_url required" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("utm_links")
    .insert({
      short_code: code,
      name: body.name ? String(body.name).slice(0, 100) : null,
      dest_url: String(body.dest_url).slice(0, 1000),
      utm_source: body.utm_source ? String(body.utm_source).slice(0, 50) : null,
      utm_medium: body.utm_medium ? String(body.utm_medium).slice(0, 50) : null,
      utm_campaign: body.utm_campaign ? String(body.utm_campaign).slice(0, 100) : null,
      utm_term: body.utm_term ? String(body.utm_term).slice(0, 100) : null,
      utm_content: body.utm_content ? String(body.utm_content).slice(0, 100) : null,
      created_by: g.user.id,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "short_code 已被用、換一個" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, short_code: (data as any).short_code, link: data });
}

export async function DELETE(req: NextRequest) {
  const g = await guard();
  if ("err" in g) return g.err;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("utm_links").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
