import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// #6 回饋迴路：學員對 AI 回答按讚/倒讚 → 寫進 ai_feedback（後台之後分析爛 case 改 prompt）
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = rateLimit(`aifb:${user.id}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const rating = body.rating === "up" || body.rating === "down" ? body.rating : null;
  if (!rating) return NextResponse.json({ error: "invalid_rating" }, { status: 400 });

  const str = (v: any, n: number) => (typeof v === "string" ? v.slice(0, n) : null);
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("ai_feedback").insert({
    user_id: user.id,
    conversation_id: typeof body.conversationId === "string" ? body.conversationId : null,
    rating,
    question: str(body.question, 1000),
    answer: str(body.answer, 4000),
    model: str(body.model, 100),
    persona: str(body.persona, 50),
    note: str(body.note, 500),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
