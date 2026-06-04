import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

// 邀請碼：去掉易混字元的 10 碼
function genCode() {
  const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const b = randomBytes(10);
  let s = "";
  for (let i = 0; i < 10; i++) s += ALPHABET[b[i] % ALPHABET.length];
  return s;
}

async function loadContext(id: string, userId: string) {
  const admin = createSupabaseAdmin();
  const { data: note, error: noteErr } = await admin.from("notes").select("id, user_id, title").eq("id", id).maybeSingle();
  if (noteErr) console.error("[note share] note lookup error:", noteErr.message);
  if (!note) return { admin, note: null, isOwner: false, isCollab: false, noteErr: noteErr?.message ?? null };
  const isOwner = note.user_id === userId;
  const { data: collabRow } = await admin
    .from("note_collaborators").select("user_id").eq("note_id", id).eq("user_id", userId).maybeSingle();
  return { admin, note, isOwner, isCollab: !!collabRow, noteErr: null };
}

async function shareState(admin: ReturnType<typeof createSupabaseAdmin>, note: { id: string; user_id: string }, origin: string) {
  const [{ data: collabs }, { data: ownerProfile }, { data: invite }] = await Promise.all([
    admin.from("note_collaborators")
      .select("user_id, role, added_at, profiles(username, display_name, avatar_url)")
      .eq("note_id", note.id).order("added_at", { ascending: true }),
    admin.from("profiles").select("id, username, display_name, avatar_url").eq("id", note.user_id).maybeSingle(),
    admin.from("note_invites").select("code")
      .eq("note_id", note.id).eq("revoked", false)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    owner: ownerProfile,
    collaborators: (collabs ?? []).map((c: any) => ({
      user_id: c.user_id, role: c.role,
      username: c.profiles?.username ?? null,
      display_name: c.profiles?.display_name ?? null,
      avatar_url: c.profiles?.avatar_url ?? null,
    })),
    code: invite?.code ?? null,
    url: invite?.code ? `${origin}/notes/join/${invite.code}` : null,
  };
}

// 列出共用狀態（擁有者或協作者皆可看）
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { admin, note, isOwner, isCollab } = await loadContext(id, user.id);
  if (!note) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isOwner && !isCollab) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const state = await shareState(admin, note, req.nextUrl.origin);
  return NextResponse.json({ isOwner, ...state });
}

// 產生 / 取得邀請碼（只有擁有者）
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { admin, note, isOwner, noteErr } = await loadContext(id, user.id);
  if (!note) {
    return NextResponse.json({
      error: "not_found",
      message: noteErr
        ? `找不到筆記（DB: ${noteErr}）`
        : "找不到這則筆記，或伺服器讀不到（請確認 SUPABASE_SERVICE_ROLE_KEY 已在 Zeabur 設好）",
      noteId: id,
    }, { status: 404 });
  }
  if (!isOwner) return NextResponse.json({ error: "owner_only", message: "只有筆記擁有者可以發邀請" }, { status: 403 });

  // 已有有效邀請碼就沿用、否則開新的
  let { data: invite } = await admin.from("note_invites").select("code")
    .eq("note_id", id).eq("revoked", false)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  let lastErr = "";
  if (!invite) {
    let code = genCode();
    for (let tries = 0; tries < 5; tries++) {
      const { data, error } = await admin.from("note_invites")
        .insert({ note_id: id, code, created_by: user.id }).select("code").single();
      if (!error && data) { invite = data; break; }
      lastErr = error?.message ?? "";
      code = genCode();
    }
  }
  if (!invite) {
    console.error("[note share] code_gen_failed:", lastErr);
    return NextResponse.json({ error: "code_gen_failed", message: lastErr || "產生邀請碼失敗" }, { status: 500 });
  }
  return NextResponse.json({ code: invite.code, url: `${req.nextUrl.origin}/notes/join/${invite.code}` });
}

// 設定協作者權限：editor（可編輯）/ viewer（唯讀）— 只有擁有者
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const targetUser = body?.userId as string | undefined;
  const role = body?.role === "viewer" ? "viewer" : "editor";
  if (!targetUser) return NextResponse.json({ error: "missing_user" }, { status: 400 });
  const { admin, note, isOwner } = await loadContext(id, user.id);
  if (!note) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isOwner) return NextResponse.json({ error: "owner_only" }, { status: 403 });
  await admin.from("note_collaborators").update({ role }).eq("note_id", id).eq("user_id", targetUser);
  return NextResponse.json({ ok: true, role });
}

// 移除協作者（擁有者移除任何人）/ 自己退出共用
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const target = body?.userId || user.id; // 沒帶 = 自己退出
  const { admin, note, isOwner } = await loadContext(id, user.id);
  if (!note) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // 擁有者可移除任何人；非擁有者只能移除自己
  if (!isOwner && target !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  // 撤掉某人共用時也一併把該筆記的邀請碼作廢，避免又被用同碼加回（擁有者操作）
  await admin.from("note_collaborators").delete().eq("note_id", id).eq("user_id", target);
  return NextResponse.json({ ok: true });
}
