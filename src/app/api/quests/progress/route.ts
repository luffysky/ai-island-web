import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// POST /api/quests/progress { type, delta? }
// 由前台關鍵動作呼叫（lesson 完成 / checkin / ai chat 等）
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: true, skipped: "anon" });

  const body = await req.json().catch(() => ({} as any));
  const type = String(body.type ?? "");
  const delta = Number(body.delta ?? 1);
  if (!type) return NextResponse.json({ error: "type_required" }, { status: 400 });

  const { data, error } = await supabase.rpc("increment_quest_progress", {
    p_quest_type: type,
    p_delta: delta,
  });
  if (error) return NextResponse.json({ ok: true, skipped: error.message });
  return NextResponse.json(data);
}
