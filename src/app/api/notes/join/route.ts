import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// 用邀請碼加入共同筆記
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { code } = await req.json().catch(() => ({}));
  if (!code || typeof code !== "string") return NextResponse.json({ error: "missing_code" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: invite } = await admin
    .from("note_invites")
    .select("note_id, created_by, revoked, expires_at")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();

  if (!invite || invite.revoked) return NextResponse.json({ error: "invalid_code", message: "邀請碼無效或已失效" }, { status: 404 });
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "expired", message: "邀請碼已過期" }, { status: 410 });
  }

  const { data: note } = await admin.from("notes").select("id, content, user_id").eq("id", invite.note_id).maybeSingle();
  if (!note) return NextResponse.json({ error: "note_gone", message: "筆記已不存在" }, { status: 404 });

  // 擁有者本人 = 已經有權限、不需加協作者
  if (note.user_id !== user.id) {
    await admin.from("note_collaborators")
      .upsert({ note_id: invite.note_id, user_id: user.id }, { onConflict: "note_id,user_id" });
  }

  const title = String(note.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 40) || "（無標題筆記）";
  return NextResponse.json({ ok: true, noteId: note.id, title, alreadyOwner: note.user_id === user.id });
}
