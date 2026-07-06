import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getLevel } from "@/lib/quest/levels";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { levelId, stars } → 記錄通關；首次通關發 XP + Z 幣。 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const level = getLevel(String(b.levelId ?? ""));
  if (!level) return NextResponse.json({ error: "bad_level" }, { status: 422 });
  const stars = Math.max(1, Math.min(3, Math.floor(Number(b.stars) || 1)));

  const admin = createSupabaseAdmin();
  const { data: existing } = await admin.from("quest_completions").select("id, stars").eq("user_id", user.id).eq("level_id", level.id).maybeSingle();
  const firstTime = !existing;

  if (existing) {
    // 只更新最佳星數，不重複發獎
    if (stars > (existing as any).stars) await admin.from("quest_completions").update({ stars, updated_at: new Date().toISOString() }).eq("id", (existing as any).id);
  } else {
    await admin.from("quest_completions").insert({ user_id: user.id, level_id: level.id, stars });
    // 首次通關發獎（沿用既有經濟）
    await admin.rpc("increment_profile_xp", { p_user_id: user.id, p_amount: level.xp }).then(() => {}, () => {});
    await admin.rpc("award_z_coin", { p_user_id: user.id, p_amount: level.z, p_reason: `quest_${level.id}` }).then(() => {}, () => {});
  }

  return NextResponse.json({ ok: true, firstTime, awarded: firstTime ? { xp: level.xp, z: level.z } : null, stars });
}
