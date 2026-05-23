import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { notifyAchievement } from "@/lib/notify-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  const achievementId = String(body.achievement_id ?? "");
  const title = String(body.title ?? achievementId);
  if (!achievementId) return NextResponse.json({ ok: true });
  notifyAchievement({ userId: user.id, achievementId, title }).catch(() => {});
  return NextResponse.json({ ok: true });
}
