import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { level: {...} } → 存一關 AI 生成的數字關卡到 quest_ai_levels（審核後才叫這個）。 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const b = await req.json().catch(() => ({} as any));
  const l = b.level ?? {};
  const title = String(l.title ?? "").trim().slice(0, 120);
  const hint = String(l.hint ?? "");
  const expect = String(l.expect ?? "");
  if (!title || !hint || !expect.trim()) return NextResponse.json({ error: "missing", message: "缺 title / hint / expect" }, { status: 422 });

  const levelId = `num-ai-${randomUUID().slice(0, 8)}`;
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("quest_ai_levels").insert({
    level_id: levelId,
    game_type: "number",
    title,
    concept: String(l.concept ?? "").slice(0, 60),
    chapter_id: Number.isFinite(Number(l.chapterId)) && Number(l.chapterId) > 0 ? Number(l.chapterId) : null,
    intro: String(l.intro ?? "").slice(0, 500),
    hint,
    expect,
    starter: String(l.starter ?? ""),
    par_lines: Math.max(1, Math.min(20, Number(l.parLines) || 5)),
    xp: Math.max(1, Math.min(50, Number(l.xp) || 15)),
    z: Math.max(0, Math.min(30, Number(l.z) || 8)),
    approved: true,
    created_by: gate.userId,
  }).select("level_id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, levelId: (data as any).level_id, href: `/quest/number/${(data as any).level_id}` });
}
