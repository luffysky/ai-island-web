import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * POST /api/reports — 使用者提交檢舉。
 * body: { target_type, target_id, target_owner_id?, reason, note? }
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const target_type = String(body.target_type ?? "");
  const target_id = String(body.target_id ?? "");
  const reason = String(body.reason ?? "");
  if (!["thread","reply","blog_article","blog_comment","user","ai_message"].includes(target_type)) {
    return NextResponse.json({ error: "invalid_target_type" }, { status: 400 });
  }
  if (!target_id) return NextResponse.json({ error: "target_id_required" }, { status: 400 });
  if (!["spam","harassment","hate_speech","sexual","illegal","self_harm","other"].includes(reason)) {
    return NextResponse.json({ error: "invalid_reason" }, { status: 400 });
  }

  const { error } = await supabase.from("user_reports").insert({
    reporter_id: user.id,
    target_type,
    target_id,
    target_owner_id: body.target_owner_id ?? null,
    reason,
    note: typeof body.note === "string" ? body.note.slice(0, 500) : null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
