import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { completeForUsage } from "@/lib/resolve-usage-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const KINDS: Record<string, { label: string; instruction: string }> = {
  elevator: {
    label: "30 秒電梯簡報",
    instruction: "寫一段 30 秒可唸完（約 90–110 字）的電梯簡報講稿：一句 hook、我是誰做什麼、解決什麼問題、為何值得選。口語、有記憶點。",
  },
  pitch: {
    label: "Pitch 簡報大綱",
    instruction: "產出 Pitch 簡報逐頁大綱（8–10 頁）。每頁：頁名 + 3–5 個要點。涵蓋問題、解法、Demo、市場、商業模式、團隊、進度、需求。",
  },
  bizplan: {
    label: "一頁商業計畫",
    instruction: "產出一頁商業計畫大綱：問題、解決方案、目標客群、市場規模、商業模式、競爭優勢、里程碑、資金需求。每段 1–3 句。",
  },
  intro: {
    label: "報名自我介紹",
    instruction: "寫一段報名表用的自我／作品介紹（150–250 字）：作品是什麼、為什麼做、目前進度與亮點、參賽動機。誠懇、具體。",
  },
};

// POST /api/opportunities/[id]/generate { about, kind } — AI 生成報名素材（草稿，供編輯）。需登入。
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入再用 AI 生成" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const about = String(body.about ?? "").trim().slice(0, 2000);
  const kind = String(body.kind ?? "elevator");
  const spec = KINDS[kind];
  if (!spec) return NextResponse.json({ error: "不支援的類型" }, { status: 400 });
  if (about.length < 4) return NextResponse.json({ error: "先描述你的作品／身分／目標" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: o } = await admin.from("opportunities")
    .select("name, organizer, description, prize_text").eq("id", id).maybeSingle();
  if (!o) return NextResponse.json({ error: "找不到這個機會" }, { status: 404 });

  const SYSTEM = `你是幫參賽者準備報名素材的寫手。根據「活動」與「使用者的作品/狀況」，產出可直接編輯使用的繁體中文草稿。
${spec.instruction}
規則：只根據使用者提供的資訊寫，**不要編造數據或成績**（沒有的就用【待補】標注）；用 Markdown；語氣專業但不浮誇。這是草稿、使用者會再改。`;

  try {
    const r = await completeForUsage("agent_core", {
      system: SYSTEM,
      user: `【活動】${o.name}${o.organizer ? `（${o.organizer}）` : ""}${o.prize_text ? `，獎金：${o.prize_text}` : ""}\n${o.description ? `活動說明：${String(o.description).slice(0, 800)}\n` : ""}\n【我的作品／狀況】\n${about}`,
      maxTokens: 1200,
      temperature: 0.5,
    });
    const draft = (r.text ?? "").trim();
    if (!draft) return NextResponse.json({ error: "AI 沒有回傳內容，稍後再試" }, { status: 502 });
    return NextResponse.json({ draft, kind, label: spec.label });
  } catch (e: any) {
    return NextResponse.json({ error: `AI 生成失敗：${String(e?.message ?? e).slice(0, 120)}` }, { status: 502 });
  }
}
