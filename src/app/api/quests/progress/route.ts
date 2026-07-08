import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// POST /api/quests/progress { type, delta? }
// 由前台關鍵動作呼叫（lesson 完成 / checkin / ai chat 等）
// 安全：delta 夾在 1..5（單一動作只該 +少量，防前端送 delta:9999 秒破任務）+ 每分鐘上限，
//       降低「前端自報進度」刷任務風險。根治需 server 端權威驗證事件來源（見 handoff 待辦）。
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: true, skipped: "anon" });

  const rl = rateLimit(`quests:progress:${user.id}`, 40, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: true, skipped: "rate_limited" });

  const body = await req.json().catch(() => ({} as any));
  const type = String(body.type ?? "");
  const delta = Math.max(1, Math.min(5, Math.floor(Number(body.delta ?? 1)) || 1)); // 夾 1..5
  if (!type) return NextResponse.json({ error: "type_required" }, { status: 400 });

  const { data, error } = await supabase.rpc("increment_quest_progress", {
    p_quest_type: type,
    p_delta: delta,
  });
  if (error) return NextResponse.json({ ok: true, skipped: error.message });
  return NextResponse.json(data);
}
