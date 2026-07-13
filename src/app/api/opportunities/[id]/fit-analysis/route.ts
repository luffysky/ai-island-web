import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { completeForUsage } from "@/lib/resolve-usage-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `你是競賽／補助報名的顧問。根據「活動的資格與需求」對照「使用者的狀況」，誠實分析他適不適合、缺什麼。一律繁體中文、白話。
固定輸出這些區塊（Markdown 標題），沒把握的就說「資料不足、無法判斷」，**不要編造、不要給保證**：
## 🎯 適合度（參考）
先給「高／中／低」其中一個，一句話說為什麼。這是參考不是保證。
## ✅ 你已經符合的
## 🧩 你可能還缺的（缺件）
條列缺的文件／條件／資格，越具體越好。
## 💪 建議先補強
2–4 個可執行的下一步。
## ⚠️ 老實說
如果明顯不符資格（如限學生但他不是），直接講。`;

// POST /api/opportunities/[id]/fit-analysis { about } — AI 對照活動需求與使用者狀況，分析適合度＋缺件。需登入。
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入再用 AI 分析" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const about = String(body.about ?? "").trim().slice(0, 2000);
  if (about.length < 4) return NextResponse.json({ error: "先簡單描述你的作品／身分／目標" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: o } = await admin.from("opportunities")
    .select("name, organizer, description, eligibility, prize_text, application_deadline, requires_demo, requires_pitch, requires_video, requires_business_plan, requires_company, requires_student, is_free")
    .eq("id", id).maybeSingle();
  if (!o) return NextResponse.json({ error: "找不到這個機會" }, { status: 404 });

  const reqs = [
    o.requires_demo ? "需 Demo" : "", o.requires_pitch ? "需上台 Pitch" : "", o.requires_video ? "需影片" : "",
    o.requires_business_plan ? "需商業計畫" : "", o.requires_company ? "限公司" : "", o.requires_student ? "限學生" : "",
  ].filter(Boolean).join("、");

  const oppText = [
    `活動：${o.name}`,
    o.organizer ? `主辦：${o.organizer}` : "",
    o.prize_text ? `獎金：${o.prize_text}` : "",
    o.application_deadline ? `截止：${o.application_deadline}` : "",
    o.is_free ? "免報名費" : "",
    reqs ? `需求：${reqs}` : "",
    o.eligibility ? `資格：${o.eligibility}` : "",
    o.description ? `說明：${String(o.description).slice(0, 1200)}` : "",
  ].filter(Boolean).join("\n");

  try {
    const r = await completeForUsage("agent_core", {
      system: SYSTEM,
      user: `【活動需求】\n${oppText}\n\n【使用者狀況】\n${about}\n\n請分析他適不適合、缺什麼。`,
      maxTokens: 1000,
      temperature: 0.3,
    });
    const analysis = (r.text ?? "").trim();
    if (!analysis) return NextResponse.json({ error: "AI 沒有回傳內容，稍後再試" }, { status: 502 });
    return NextResponse.json({ analysis });
  } catch (e: any) {
    return NextResponse.json({ error: `AI 分析失敗：${String(e?.message ?? e).slice(0, 120)}` }, { status: 502 });
  }
}
