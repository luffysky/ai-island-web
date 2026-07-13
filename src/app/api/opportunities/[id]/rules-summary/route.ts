import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { completeForUsage } from "@/lib/resolve-usage-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `你是競賽／補助／徵件規則整理助手。把提供的活動規則整理成新手也看得懂的結構化重點，一律用繁體中文。
固定輸出這些區塊（用 Markdown 標題），沒有的資訊就寫「規則沒寫清楚，去官網確認」，**絕對不要編造**：
## 📌 一句話總結
## ✅ 報名資格
## 📄 要準備的文件
## 🗓️ 重要日期
## 🏆 獎金・資源
## ⚖️ 評分／重點
## ⚠️ 我該注意的坑
語氣白話、條列清楚、每點一行。`;

// POST /api/opportunities/[id]/rules-summary { text? } — AI 讀規則、整理成結構化重點。
// text 有給就整理它；沒給就用這筆機會自己的描述/資格/獎金/時程。需登入（AI 有成本）。
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入再用 AI 讀規則" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const pasted = String(body.text ?? "").trim().slice(0, 8000);

  const admin = createSupabaseAdmin();
  const { data: o } = await admin.from("opportunities")
    .select("name, organizer, description, eligibility, prize_text, application_start, application_deadline, official_url")
    .eq("id", id).maybeSingle();
  if (!o) return NextResponse.json({ error: "找不到這個機會" }, { status: 404 });

  const base = pasted || [
    `活動：${o.name}`,
    o.organizer ? `主辦：${o.organizer}` : "",
    o.prize_text ? `獎金／資源：${o.prize_text}` : "",
    o.application_start ? `報名開始：${o.application_start}` : "",
    o.application_deadline ? `報名截止：${o.application_deadline}` : "",
    o.eligibility ? `資格：${o.eligibility}` : "",
    o.description ? `說明：${o.description}` : "",
  ].filter(Boolean).join("\n");

  if (base.trim().length < 20) {
    return NextResponse.json({ error: "這筆機會目前資料太少、無法整理。可以把官網規則貼進來讓我讀。" }, { status: 400 });
  }

  try {
    const r = await completeForUsage("agent_core", {
      system: SYSTEM,
      user: `請整理以下活動規則：\n\n${base}`,
      maxTokens: 1100,
      temperature: 0.2,
    });
    const summary = (r.text ?? "").trim();
    if (!summary) return NextResponse.json({ error: "AI 沒有回傳內容，稍後再試" }, { status: 502 });
    return NextResponse.json({ summary, usedPasted: !!pasted });
  } catch (e: any) {
    return NextResponse.json({ error: `AI 讀規則失敗：${String(e?.message ?? e).slice(0, 120)}` }, { status: 502 });
  }
}
