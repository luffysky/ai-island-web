import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";

const ALLOWED = ["👍", "❤️", "🔥", "🎉", "🤔", "👀"];

// GET /api/forum/threads/[id]/reactions — 取各 emoji 數量 + 我按過的
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("forum_reactions")
    .select("emoji, user_id")
    .eq("thread_id", id);

  const counts: Record<string, number> = {};
  (data ?? []).forEach((r: any) => {
    counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
  });

  // 我按過哪些
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const mine = user
    ? (data ?? []).filter((r: any) => r.user_id === user.id).map((r: any) => r.emoji)
    : [];

  return NextResponse.json({ reactions: counts, mine });
}

// POST — 切換一個 emoji（body: { emoji }）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { emoji } = await req.json();
  if (!ALLOWED.includes(emoji)) {
    return NextResponse.json({ error: "invalid_emoji" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("forum_reactions")
    .select("id")
    .eq("thread_id", id)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  let active: boolean;
  if (existing) {
    await supabase.from("forum_reactions").delete().eq("id", existing.id);
    active = false;
  } else {
    await supabase.from("forum_reactions").insert({
      thread_id: id,
      user_id: user.id,
      emoji,
    });
    active = true;
  }

  return NextResponse.json({ ok: true, emoji, active });
}
