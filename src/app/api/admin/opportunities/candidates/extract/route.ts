import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { completeForUsage } from "@/lib/resolve-usage-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `你是把「競賽／補助公告」抽成結構化欄位的工具。只根據提供的文字抽取，**找不到就填 null、絕不編造**。
只輸出一個 JSON 物件（不要多餘文字），欄位：
{
 "category": "分類（如 AI/補助/設計/黑客松/文學…，找不到給最合適的一詞）| null",
 "application_deadline": "報名截止日 YYYY-MM-DD | null",
 "prize_text": "獎金/資源一句話 | null",
 "is_free": true/false/null,
 "organizer": "主辦單位 | null"
}`;

// POST { id } — 讀候選的原文（raw_url 頁面 or raw_summary），AI 抽結構化欄位供人工核准前預填。
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const b = await req.json().catch(() => ({} as any));
  const id = String(b.id ?? "");
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { data: cand } = await admin.from("opportunity_candidates").select("raw_title, raw_url, raw_summary").eq("id", id).maybeSingle();
  if (!cand) return NextResponse.json({ error: "找不到候選" }, { status: 404 });

  // 抓原文頁（失敗就退回用 raw_summary）
  let pageText = String(cand.raw_summary ?? "");
  if (cand.raw_url) {
    try {
      const resp = await fetch(cand.raw_url, { headers: { "User-Agent": "AI-Island-Radar/1.0" }, signal: AbortSignal.timeout(12000) });
      if (resp.ok) {
        const html = await resp.text();
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
        if (text.length > 200) pageText = text.slice(0, 6000);
      }
    } catch { /* 用 raw_summary */ }
  }

  const input = `標題：${cand.raw_title}\n\n內文：${pageText.slice(0, 6000)}`;
  try {
    const r = await completeForUsage("agent_core", { system: SYSTEM, user: input, maxTokens: 400, temperature: 0 });
    const raw = (r.text ?? "").trim();
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return NextResponse.json({ error: "AI 沒抽到結構化結果", raw: raw.slice(0, 200) }, { status: 502 });
    let parsed: any;
    try { parsed = JSON.parse(m[0]); } catch { return NextResponse.json({ error: "AI 回傳非合法 JSON" }, { status: 502 }); }
    // 淨化 deadline 格式
    const dl = typeof parsed.application_deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.application_deadline) ? parsed.application_deadline : null;
    return NextResponse.json({
      suggestion: {
        category: parsed.category ? String(parsed.category).slice(0, 40) : null,
        application_deadline: dl,
        prize_text: parsed.prize_text ? String(parsed.prize_text).slice(0, 200) : null,
        is_free: typeof parsed.is_free === "boolean" ? parsed.is_free : null,
        organizer: parsed.organizer ? String(parsed.organizer).slice(0, 120) : null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: `抽取失敗：${String(e?.message ?? e).slice(0, 120)}` }, { status: 502 });
  }
}
