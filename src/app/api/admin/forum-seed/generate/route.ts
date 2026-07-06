import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptKey } from "@/lib/ai-crypto";
import { callAI } from "@/lib/ai-providers";
import { pickModelForUsage } from "@/lib/ai-usage-models";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const TONES: Record<string, string> = {
  newbie: "真實新手、半懂半不懂、有點不好意思但真心想問",
  excited: "熱血、剛學會很興奮、想分享打卡",
  stuck: "卡關崩潰求救、貼 code / 錯誤訊息",
  share: "分享型、整理好資源 / 心得給大家",
  chat: "輕鬆閒聊、吐槽、日常",
  teach: "像學長姐寫的簡短教學",
};

const INTENTS: Record<string, string> = {
  discuss: "結尾一定要拋一個明確的問題、引大家回覆",
  resonate: "製造共鳴、讓有相同經驗的人想留言",
  teach: "帶出一個可學到的知識點",
  feature: "自然帶出站內功能（章節 / 副本 / 綠寶 AI / 排行榜），但不要像廣告",
};

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const rl = rateLimit(`forum-seed:${gate.userId}`, 40, 3600_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", retry_after: rl.retryAfter }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const boardName = String(body.boardName ?? "").slice(0, 60);
  const boardDesc = String(body.boardDesc ?? "").slice(0, 200);
  const tone = TONES[body.tone] ? body.tone : "newbie";
  const intent = INTENTS[body.intent] ? body.intent : "discuss";
  const count = Math.max(1, Math.min(8, Number(body.count) || 5));
  const topic = String(body.topic ?? "").slice(0, 300);
  if (!boardName) return NextResponse.json({ error: "missing_board" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: models } = await admin.from("ai_models").select("*").eq("is_active", true);
  if (!models || models.length === 0) return NextResponse.json({ error: "no_model" }, { status: 503 });
  const model = (await pickModelForUsage("nami_help" as any, models as any[])) ?? (models as any[]).find((m) => m.provider === "anthropic") ?? (models as any[])[0];
  const { data: sysKey } = await admin.from("ai_api_keys").select("api_key_encrypted, enabled").eq("provider", model.provider).maybeSingle();
  if (!sysKey || !(sysKey as any).enabled) return NextResponse.json({ error: "no_api_key" }, { status: 503 });
  let apiKey: string;
  try { apiKey = decryptKey((sysKey as any).api_key_encrypted); } catch { return NextResponse.json({ error: "decrypt_failed" }, { status: 500 }); }

  const system = `你是 AI 島（繁體中文程式自學平台）討論區的「種子內容產生器」。生一批**看起來像真實島民、但不浮誇**的討論區貼文草稿，讓新開的討論區有生氣。
版塊：「${boardName}」${boardDesc ? `（${boardDesc}）` : ""}
語氣：${TONES[tone]}
目的：${INTENTS[intent]}
${topic ? `主題方向：${topic}` : ""}

規則：
1. 生 ${count} 篇**不同**的草稿，主題不重複、長短有變化。
2. title 像真人會下的、口語、可帶一點情緒或 emoji（別每篇都放）。
3. content 是 2~4 段的 HTML（只用 <p>；貼 code 用 <pre><code>，記得把 < > 轉成 &lt; &gt;）。真實、具體、不空話。
4. 每篇 2~4 個 tags（繁中短詞）。
5. 不要寫「歡迎大家踴躍發言」這種官腔；要像真的在問 / 分享。
只回傳 JSON（不要 markdown fence）：{"drafts":[{"title":"","content":"<p>…</p>","tags":["",""]}]}`;

  try {
    const r = await callAI({
      provider: model.provider, model: model.model_name, apiKey,
      messages: [{ role: "system", content: system }, { role: "user", content: `請生 ${count} 篇「${boardName}」的草稿，回 JSON。` }],
      temperature: 0.95, maxTokens: 3500,
    });
    const text = r.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {
      const s = text.indexOf("{"), e = text.lastIndexOf("}");
      if (s >= 0 && e > s) { try { parsed = JSON.parse(text.slice(s, e + 1)); } catch { /* noop */ } }
    }
    const drafts = Array.isArray(parsed?.drafts) ? parsed.drafts.filter((d: any) => d?.title && d?.content).slice(0, count) : [];
    if (!drafts.length) return NextResponse.json({ error: "parse_failed", raw: text.slice(0, 400) }, { status: 500 });
    return NextResponse.json({ ok: true, drafts });
  } catch (e: any) {
    return NextResponse.json({ error: "ai_failed", message: e?.message }, { status: 500 });
  }
}
