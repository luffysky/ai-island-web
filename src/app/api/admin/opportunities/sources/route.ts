import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — 來源清單 + 待審候選數
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const admin = createSupabaseAdmin();
  const { data: sources } = await admin.from("opportunity_sources")
    .select("*").order("created_at", { ascending: false });
  const { count: pending } = await admin.from("opportunity_candidates")
    .select("id", { count: "exact", head: true }).eq("status", "pending");
  return NextResponse.json({ sources: sources ?? [], pendingCandidates: pending ?? 0 });
}

// POST — 新增來源
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const b = await req.json().catch(() => ({} as any));
  const name = String(b.name ?? "").trim().slice(0, 120);
  const url = String(b.url ?? "").trim().slice(0, 500);
  if (!name || !/^https?:\/\//.test(url)) return NextResponse.json({ error: "缺 name 或 url（要 http(s):// 開頭）" }, { status: 400 });
  const kind = ["rss", "atom", "api", "sitemap", "manual"].includes(b.kind) ? b.kind : "rss";
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("opportunity_sources")
    .insert({ name, url, kind, category_hint: String(b.category_hint ?? "").trim().slice(0, 40) || null, notes: String(b.notes ?? "").trim().slice(0, 300) || null })
    .select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ source: data });
}

// PATCH ?id= — 開關 / 編輯
export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  const b = await req.json().catch(() => ({} as any));
  const patch: Record<string, any> = {};
  if (typeof b.enabled === "boolean") patch.enabled = b.enabled;
  if (typeof b.name === "string") patch.name = b.name.trim().slice(0, 120);
  if (typeof b.category_hint === "string") patch.category_hint = b.category_hint.trim().slice(0, 40) || null;
  if (typeof b.notes === "string") patch.notes = b.notes.trim().slice(0, 300) || null;
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("opportunity_sources").update(patch).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ source: data });
}

// DELETE ?id=
export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("opportunity_sources").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
