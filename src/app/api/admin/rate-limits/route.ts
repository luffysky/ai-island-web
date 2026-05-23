import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function assertAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const, status: 401 };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "forbidden" as const, status: 403 };
  return { ok: true as const };
}

export async function POST(req: NextRequest) {
  const a = await assertAdmin();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const body = await req.json().catch(() => ({} as any));
  const scope = String(body.scope ?? "").trim();
  const limit_count = Number(body.limit_count);
  const window_seconds = Number(body.window_seconds);
  if (!scope || !Number.isFinite(limit_count) || limit_count < 1 || !Number.isFinite(window_seconds) || window_seconds < 1) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("rate_limit_rules")
    .insert({ scope, limit_count, window_seconds, note: body.note ?? null });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const a = await assertAdmin();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const body = await req.json().catch(() => ({} as any));
  const scope = String(body.scope ?? "").trim();
  if (!scope) return NextResponse.json({ error: "scope_required" }, { status: 400 });

  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.limit_count != null) {
    const v = Number(body.limit_count);
    if (!Number.isFinite(v) || v < 1) return NextResponse.json({ error: "invalid_limit" }, { status: 400 });
    patch.limit_count = v;
  }
  if (body.window_seconds != null) {
    const v = Number(body.window_seconds);
    if (!Number.isFinite(v) || v < 1) return NextResponse.json({ error: "invalid_window" }, { status: 400 });
    patch.window_seconds = v;
  }
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (body.note !== undefined) patch.note = body.note;

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("rate_limit_rules").update(patch).eq("scope", scope);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const a = await assertAdmin();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const scope = req.nextUrl.searchParams.get("scope");
  if (!scope) return NextResponse.json({ error: "scope_required" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("rate_limit_rules").delete().eq("scope", scope);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
