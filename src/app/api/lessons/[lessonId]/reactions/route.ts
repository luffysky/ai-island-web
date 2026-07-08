import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { LEARN_REACTIONS } from "@/lib/reactions";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(LEARN_REACTIONS.map((r) => r.key));

// GET — 取這節課各反應的數量
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await params;
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("lesson_reactions").select("reaction_key").eq("lesson_id", lessonId);
  const counts: Record<string, number> = {};
  (data ?? []).forEach((r: any) => { counts[r.reaction_key] = (counts[r.reaction_key] ?? 0) + 1; });
  return NextResponse.json({ reactions: counts });
}

// POST — 切換一個反應（同 fingerprint 已按過 → 取消、否則新增）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await params;
  const body = await req.json().catch(() => ({}));
  const reactionKey = String(body.reactionKey ?? "");
  const fp = String(body.fingerprint ?? "").slice(0, 64);
  const chapterId = Number.isFinite(body.chapterId) ? Number(body.chapterId) : null;
  if (!ALLOWED.has(reactionKey) || !fp) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: existing } = await admin
    .from("lesson_reactions")
    .select("id")
    .eq("lesson_id", lessonId)
    .eq("fingerprint", fp)
    .eq("reaction_key", reactionKey)
    .maybeSingle();

  let active: boolean;
  if (existing) {
    await admin.from("lesson_reactions").delete().eq("id", (existing as any).id);
    active = false;
  } else {
    await admin.from("lesson_reactions").insert({ lesson_id: lessonId, chapter_id: chapterId, fingerprint: fp, reaction_key: reactionKey });
    active = true;
  }
  return NextResponse.json({ ok: true, reactionKey, active });
}
