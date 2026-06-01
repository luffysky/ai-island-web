import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null as null, ok: false };
  const { data: profile } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  return { user, ok: profile?.role === "admin" || (profile as any)?.is_owner === true };
}

/** GET → { folders } */
export async function GET() {
  const { ok } = await guard();
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("idea_folders").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ folders: data ?? [] });
}

/** POST { name, color? } → { folder } */
export async function POST(req: NextRequest) {
  const { user, ok } = await guard();
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({} as any));
  const name = String(body.name ?? "").trim().slice(0, 60);
  if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("idea_folders")
    .insert({ created_by: user!.id, name, color: body.color ? String(body.color).slice(0, 20) : null })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ folder: data });
}
