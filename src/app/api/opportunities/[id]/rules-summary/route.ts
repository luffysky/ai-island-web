import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { completeForUsage } from "@/lib/resolve-usage-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const UA = "Mozilla/5.0 (compatible; AI-Island-Bot/1.0; +https://ai-island-web.snowrealm.pet)";

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
}

// 抓網址 → 純文字（PDF 用 unpdf 解析、HTML 去標籤）。回 { text } 或 { error }。
async function fetchUrlText(rawUrl: string): Promise<{ text?: string; error?: string }> {
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`); }
  catch { return { error: "網址格式不對" }; }
  if (!/^https?:$/.test(url.protocol)) return { error: "只支援 http/https 網址" };
  try {
    const r = await fetch(url.toString(), { headers: { "User-Agent": UA, "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8" }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) return { error: `抓取失敗（HTTP ${r.status}）` };
    const ct = (r.headers.get("content-type") ?? "").toLowerCase();
    const isPdf = ct.includes("pdf") || /\.pdf(\?|$)/i.test(url.pathname);
    if (isPdf) {
      const buf = new Uint8Array(await r.arrayBuffer());
      if (buf.byteLength > 20_000_000) return { error: "PDF 太大（>20MB）" };
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(buf);
      const { text } = await extractText(pdf, { mergePages: true });
      const merged = Array.isArray(text) ? text.join("\n") : String(text ?? "");
      return { text: merged.replace(/\s+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim() };
    }
    if (/text\/html|text\/plain|xhtml/.test(ct)) return { text: htmlToText((await r.text()).slice(0, 500_000)) };
    return { error: "這個連結不是可讀的網頁或 PDF" };
  } catch (e: any) {
    return { error: e?.name === "TimeoutError" ? "抓取逾時" : "抓取失敗" };
  }
}

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
  let pasted = String(body.text ?? "").trim().slice(0, 8000);
  const url = String(body.url ?? "").trim();

  // 有給網址（簡章常是 PDF）→ 伺服器抓取並解析成文字，併進 pasted 一起餵 AI
  let fetchedFrom = "";
  if (url) {
    const f = await fetchUrlText(url);
    if (f.error) return NextResponse.json({ error: `讀取連結失敗：${f.error}（可改貼文字）` }, { status: 422 });
    const fetched = (f.text ?? "").slice(0, 8000);
    if (fetched.replace(/\s/g, "").length < 20) return NextResponse.json({ error: "這個連結抓不到可讀文字（可能是掃描檔/圖片 PDF），請改貼文字" }, { status: 422 });
    pasted = pasted ? `${pasted}\n\n【連結內容】${fetched}` : fetched;
    fetchedFrom = url;
  }

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
    return NextResponse.json({ summary, usedPasted: !!pasted, fetchedFrom });
  } catch (e: any) {
    return NextResponse.json({ error: `AI 讀規則失敗：${String(e?.message ?? e).slice(0, 120)}` }, { status: 502 });
  }
}
