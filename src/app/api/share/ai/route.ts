import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { persona, question, answer } → { token, path }：建立 AI 回答分享短連結。 */
export async function POST(req: NextRequest) {
  // 公開端點：用 IP 限流，防無上限灌 row（每分鐘 20 次）
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const rl = rateLimit(`share-ai:${ip}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", message: "太頻繁，請稍後再試" }, { status: 429 });

  const b = await req.json().catch(() => ({} as any));
  const persona = String(b.persona ?? "綠寶").slice(0, 16);
  const question = String(b.question ?? "").slice(0, 200);
  const answer = String(b.answer ?? "").slice(0, 8000);
  if (!answer.trim()) return NextResponse.json({ error: "validation", message: "缺內容" }, { status: 422 });

  const admin = createSupabaseAdmin();
  // 產生短 token、碰撞就重試
  for (let attempt = 0; attempt < 4; attempt++) {
    const token = randomUUID().replace(/-/g, "").slice(0, 10);
    const { error } = await admin.from("ai_shares").insert({ token, persona, question, answer });
    if (!error) return NextResponse.json({ token, path: `/share/ai/${token}` });
    if (!/duplicate|unique/i.test(error.message)) {
      return NextResponse.json({ error: "db", message: error.message }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "token", message: "無法產生連結，請重試" }, { status: 500 });
}
