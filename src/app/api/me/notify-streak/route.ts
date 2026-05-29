import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { notifyStreakMilestone } from "@/lib/notify-helpers";

export const dynamic = "force-dynamic";

/**
 * 連勝里程碑 push 端點
 * DailyCheckin component 收到 do_checkin RPC 回應後、若 streak ∈ [7,30,100,365]、
 * fire-and-forget POST 觸發 LINE / in-app / admin 通知。
 *
 * 非里程碑天數 notifyStreakMilestone 內會早 return、不會發訊。
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  const streak = Number(body.streak);
  if (!Number.isFinite(streak) || streak <= 0) {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }
  // fire-and-forget
  notifyStreakMilestone({ userId: user.id, streak }).catch(() => {});
  return NextResponse.json({ ok: true });
}
