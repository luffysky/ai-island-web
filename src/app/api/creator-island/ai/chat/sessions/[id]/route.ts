import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET → { session:{id,title,messages} }（只能讀自己的） */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_chat_sessions")
    .select("id, title, messages").eq("id", id).eq("user_id", u.userId).maybeSingle();
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ session: data });
}

/** DELETE → { ok }（只能刪自己的） */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const { error, count } = await admin.from("ci_chat_sessions")
    .delete({ count: "exact" }).eq("id", id).eq("user_id", u.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!count) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
