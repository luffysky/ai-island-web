import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard() {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.response };
  return { user: { id: gate.userId } };
}

function clampPct(n: any, fallback = 0) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(100, Math.round(v * 100) / 100));
}

export async function POST(req: NextRequest) {
  const g = await guard();
  if ("error" in g) return g.error;
  const body = await req.json().catch(() => ({} as any));
  const code = String(body.code ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  if (!code || code.length < 3 || code.length > 30) {
    return NextResponse.json({ error: "code 需 3-30 個英數/_/-" }, { status: 400 });
  }
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("affiliate_codes")
    .insert({
      code,
      owner_name: body.owner_name ? String(body.owner_name).slice(0, 100) : null,
      description: body.description ? String(body.description).slice(0, 500) : null,
      commission_pct: clampPct(body.commission_pct, 10),
      discount_pct: clampPct(body.discount_pct, 0),
      max_uses: body.max_uses ? Number(body.max_uses) : null,
      expires_at: body.expires_at ?? null,
      enabled: body.enabled !== false,
    })
    .select("id, code")
    .single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "code 已存在" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: (data as any).id });
}

export async function PATCH(req: NextRequest) {
  const g = await guard();
  if ("error" in g) return g.error;
  const body = await req.json().catch(() => ({} as any));
  if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const patch: any = {};
  if (body.owner_name !== undefined) patch.owner_name = body.owner_name ? String(body.owner_name).slice(0, 100) : null;
  if (body.description !== undefined) patch.description = body.description ? String(body.description).slice(0, 500) : null;
  if (body.commission_pct !== undefined) patch.commission_pct = clampPct(body.commission_pct);
  if (body.discount_pct !== undefined) patch.discount_pct = clampPct(body.discount_pct);
  if (body.max_uses !== undefined) patch.max_uses = body.max_uses ? Number(body.max_uses) : null;
  if (body.expires_at !== undefined) patch.expires_at = body.expires_at;
  if (body.enabled !== undefined) patch.enabled = !!body.enabled;
  const { error } = await admin.from("affiliate_codes").update(patch).eq("id", body.id);
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
  const { error } = await admin.from("affiliate_codes").update({ enabled: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
