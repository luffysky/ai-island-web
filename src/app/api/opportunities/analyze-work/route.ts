import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { completeForUsage } from "@/lib/resolve-usage-ai";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// 機會島 · AI 作品分析：貼網址（作品集/GitHub/個人網站）或文字（履歷/專案說明）→ 能力圖譜。
// 純唯讀分析、不寫任何表；結果由前端呈現、使用者可據此找匹配機會。

const UA = "Mozilla/5.0 (compatible; AI-Island-Bot/1.0; +https://ai-island-web.snowrealm.pet)";

function htmlToText(html: string): { title: string; text: string } {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return { title, text };
}

function extractJson(raw: string): any | null {
  const t = (raw ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s === -1 || e <= s) return null;
  try { return JSON.parse(t.slice(s, e + 1)); } catch { return null; }
}

const SYSTEM = `你是「AI 島 · 作品能力分析師」。使用者給你一份作品/履歷/專案的內容（可能來自網站抓取、雜訊多），
你要看懂它、萃取出這個人的**能力圖譜**，幫他之後對接競賽/補助/工作機會。
只回傳**一個 JSON 物件**（不要任何解釋、不要 markdown 圍欄），全部**繁體中文**，格式：
{
  "summary": "2~3 句話：這個人/作品在做什麼、強在哪",
  "roles": ["1~3 個最貼切的定位，如 前端工程師 / 獨立開發者 / UI 設計師 / 資料分析"],
  "skills": [
    { "name": "技能名（具體，如 React、資料視覺化、產品設計）", "level": 1到5的整數, "evidence": "從內容看到的依據（一句）" }
  ],
  "strengths": ["2~4 個明確優勢"],
  "gaps": ["2~4 個可補強處或缺口（誠實但正向）"],
  "directions": ["2~4 個適合他去試的方向/機會類型，如 前端競賽 / 政府數位補助 / 接案 / 開源"],
  "opportunityKeywords": ["3~6 個用來在機會島搜尋的關鍵字"]
}
規則：skills 給 5~10 項、level 依證據保守評（沒把握別給 5）；只根據內容、**不要杜撰**沒看到的東西；
內容太少就少列、gaps 寫「資訊不足、建議補上作品連結/說明」。`;

export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const rl = rateLimit(`analyze-work:${user.id}`, 20, 3600_000);
  if (!rl.ok) return NextResponse.json({ error: "太頻繁了，稍後再試", retry_after: rl.retryAfter }, { status: 429 });

  const b = await req.json().catch(() => ({} as any));
  const rawUrl = String(b.url ?? "").trim();
  let text = String(b.text ?? "").trim();
  let sourceTitle = "";
  let sourceUrl = "";

  // 有網址 → 伺服器端抓取轉純文字（限時、限量、只允許 http/https）
  if (rawUrl) {
    let url: URL;
    try { url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`); }
    catch { return NextResponse.json({ error: "網址格式不對" }, { status: 400 }); }
    if (!/^https?:$/.test(url.protocol)) return NextResponse.json({ error: "只支援 http/https 網址" }, { status: 400 });
    try {
      const r = await fetch(url.toString(), { headers: { "User-Agent": UA, "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8" }, signal: AbortSignal.timeout(15000) });
      if (!r.ok) return NextResponse.json({ error: `抓取失敗（HTTP ${r.status}），可改貼文字內容` }, { status: 422 });
      const ct = r.headers.get("content-type") ?? "";
      if (!/text\/html|text\/plain|application\/xhtml/i.test(ct)) return NextResponse.json({ error: "這個網址不是可讀的網頁（可能是檔案/需登入），請改貼文字" }, { status: 422 });
      const html = (await r.text()).slice(0, 400_000);
      const parsed = htmlToText(html);
      sourceTitle = parsed.title;
      sourceUrl = url.toString();
      const fetched = parsed.text;
      text = text ? `${text}\n\n【網頁內容】${fetched}` : fetched;
    } catch (e: any) {
      const msg = e?.name === "TimeoutError" ? "抓取逾時" : "抓取失敗";
      return NextResponse.json({ error: `${msg}，可改貼文字內容` }, { status: 422 });
    }
  }

  text = text.slice(0, 9000);
  if (text.replace(/\s/g, "").length < 20) {
    return NextResponse.json({ error: "內容太少，貼上作品網址或多寫一點專案/履歷內容" }, { status: 400 });
  }

  const userMsg = `${sourceTitle ? `標題：${sourceTitle}\n` : ""}${sourceUrl ? `來源：${sourceUrl}\n\n` : ""}內容：\n${text}\n\n只回 JSON。`;

  let out: string;
  try {
    out = (await completeForUsage("agent_core", { system: SYSTEM, user: userMsg, maxTokens: 1600, temperature: 0.4 })).text;
  } catch {
    return NextResponse.json({ error: "AI 分析暫時不可用，稍後再試" }, { status: 503 });
  }

  const parsed = extractJson(out);
  if (!parsed || !Array.isArray(parsed.skills)) {
    return NextResponse.json({ error: "分析結果解析失敗，換個內容或稍後再試" }, { status: 502 });
  }

  // 正規化 + 夾範圍（防 AI 亂給）
  const skills = (parsed.skills as any[]).slice(0, 12).map((s) => ({
    name: String(s?.name ?? "").slice(0, 40),
    level: Math.max(1, Math.min(5, Math.round(Number(s?.level) || 3))),
    evidence: String(s?.evidence ?? "").slice(0, 120),
  })).filter((s) => s.name);
  const arr = (v: any, n: number, len: number) => (Array.isArray(v) ? v : []).slice(0, n).map((x) => String(x).slice(0, len)).filter(Boolean);

  return NextResponse.json({
    result: {
      summary: String(parsed.summary ?? "").slice(0, 400),
      roles: arr(parsed.roles, 3, 30),
      skills,
      strengths: arr(parsed.strengths, 5, 80),
      gaps: arr(parsed.gaps, 5, 100),
      directions: arr(parsed.directions, 5, 60),
      opportunityKeywords: arr(parsed.opportunityKeywords, 6, 24),
      sourceUrl,
      sourceTitle,
    },
  });
}
