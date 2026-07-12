import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { completeForUsage } from "@/lib/resolve-usage-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/opportunities/recommend { about } — AI 依你的狀況從開放中的機會挑出最適合的（附原因/符合率）
// 免費模型優先（走系統金鑰、completeForUsage 自動升級），不消耗使用者額度。
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({} as any));
  const about = String(b.about ?? "").trim().slice(0, 1000);
  if (!about) return NextResponse.json({ error: "請描述你的作品/身分/目標" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: opps } = await admin.from("opportunities")
    .select("id, name, category, prize_text, application_deadline, requires_company, requires_student, requires_demo, requires_pitch, tags, description")
    .eq("status", "open").limit(60);
  if (!opps || opps.length === 0) return NextResponse.json({ results: [] });

  const list = opps.map((o: any, i: number) =>
    `[${i}] ${o.name}｜類別:${o.category ?? "-"}｜獎金:${o.prize_text ?? "-"}｜截止:${o.application_deadline ?? "-"}｜${o.requires_company ? "限公司 " : ""}${o.requires_student ? "限學生 " : ""}標籤:${(o.tags ?? []).join("/")}`,
  ).join("\n");

  const system = `你是 AI 島「機會島」的推薦顧問。根據使用者描述，從「機會清單」挑出最適合的 3-5 個。
只回 JSON 陣列，每項 {"i":清單編號, "fit":符合率0-100整數, "reason":"一句話中文原因（點出符合哪些條件）"}。
規則：只挑清單裡真的存在的編號；不符合資格（如限公司但對方沒公司）就別選或標低 fit；沒有合適就回 []。依 fit 由高到低排。`;
  const user = `使用者描述：${about}\n\n機會清單：\n${list}\n\n只回 JSON 陣列。`;

  let items: any[] = [];
  try {
    const res = await completeForUsage("agent_core", { system, user, maxTokens: 600, defaultModel: "gemini-2.5-flash" });
    const t = (res.text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const s = t.indexOf("["), e = t.lastIndexOf("]");
    if (s !== -1 && e !== -1) items = JSON.parse(t.slice(s, e + 1));
  } catch { /* 模型失敗 → 回空、前端 fallback 顯示一般清單 */ }

  const results = (Array.isArray(items) ? items : [])
    .filter((x) => x && Number.isInteger(x.i) && opps[x.i])
    .slice(0, 5)
    .map((x) => ({ ...opps[x.i], fit: Math.max(0, Math.min(100, Number(x.fit) || 0)), reason: String(x.reason ?? "").slice(0, 120) }));

  return NextResponse.json({ results });
}
