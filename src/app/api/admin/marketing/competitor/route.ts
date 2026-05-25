import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const THREATS = new Set(["low", "medium", "high", "direct"]);

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
  const name = String(body.name ?? "").trim();
  if (!name || name.length > 100) {
    return NextResponse.json({ error: "name 需 1-100 字" }, { status: 400 });
  }
  const threat_level = THREATS.has(body.threat_level) ? body.threat_level : "medium";
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("competitor_snapshots")
    .insert({
      name,
      url: body.url ? String(body.url).slice(0, 500) : null,
      category: body.category ? String(body.category).slice(0, 50) : null,
      notes: body.notes ? String(body.notes).slice(0, 2000) : null,
      threat_level,
      features: Array.isArray(body.features) ? body.features.slice(0, 30).map(String) : null,
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
  const patch: any = {};
  if (body.name !== undefined) patch.name = String(body.name).slice(0, 100);
  if (body.url !== undefined) patch.url = body.url ? String(body.url).slice(0, 500) : null;
  if (body.category !== undefined) patch.category = body.category ? String(body.category).slice(0, 50) : null;
  if (body.notes !== undefined) patch.notes = body.notes ? String(body.notes).slice(0, 2000) : null;
  if (body.threat_level !== undefined && THREATS.has(body.threat_level)) patch.threat_level = body.threat_level;
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("competitor_snapshots").update(patch).eq("id", body.id);
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
  const { error } = await admin.from("competitor_snapshots").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
