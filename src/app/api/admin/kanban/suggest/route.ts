import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getProviderKey } from "@/lib/ai-crypto";
import { getModelNameForUsage } from "@/lib/ai-usage-models";
import { callAI } from "@/lib/ai-providers";

function providerFromModel(model: string): "anthropic" | "openai" | "google" | "groq" {
  if (/^claude/i.test(model)) return "anthropic";
  if (/^gemini/i.test(model)) return "google";
  if (/^(llama|mixtral)/i.test(model)) return "groq";
  return "openai"; // gpt-* / 預設
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 雪鑰建議下一個該做 — POST 拿 todo board 全部卡、AI 回 Top 3 推薦 + 理由
 */
export async function POST() {
  try {
    // Promise.race 25s 強制 timeout、避免 Zeabur platform 30s kill 變 502
    return await Promise.race([
      handle(),
      new Promise<NextResponse>((resolve) =>
        setTimeout(() => resolve(NextResponse.json({
          error: "雪鑰想超過 25 秒、可能 Anthropic 端慢回 / DB 慢 query、稍後再試一次",
        }, { status: 504 })), 25_000),
      ),
    ]);
  } catch (e: any) {
    // outer guard — 任何 uncaught throw 都包成 JSON 回、避免 Next.js 默認 502 HTML
    console.error("[kanban/suggest] uncaught:", e?.stack || e?.message || e);
    return NextResponse.json({
      error: e?.message ? `internal_error: ${String(e.message).slice(0, 200)}` : "internal_error",
    }, { status: 500 });
  }
}

async function handle() {
  const t0 = Date.now();
  const tlog = (tag: string) => console.log(`[suggest] +${Date.now() - t0}ms ${tag}`);
  const supabase = await createSupabaseServer();
  tlog("supabase server ready");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: p } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  if (!(p as any)?.is_owner && !["admin", "owner"].includes((p as any)?.role ?? "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createSupabaseAdmin();
  // 撈 todo board 的 TODO + DOING column 全部卡
  const { data: board } = await admin.from("admin_kanban_boards").select("id").eq("slug", "todo").maybeSingle();
  if (!board) return NextResponse.json({ error: "todo_board_not_found" }, { status: 500 });
  const { data: cols } = await admin.from("admin_kanban_columns").select("id, title").eq("board_id", (board as any).id);
  const activeColIds = (cols ?? []).filter((c: any) => c.title === "TODO" || c.title === "DOING").map((c: any) => c.id);
  tlog(`board+cols done, activeColIds=${activeColIds.length}`);
  const { data: cards } = await admin
    .from("admin_kanban_cards")
    .select("id, title, description, category, labels, updated_at")
    .in("column_id", activeColIds);
  tlog(`cards loaded n=${(cards ?? []).length}`);

  const cardList = (cards ?? []) as any[];
  if (cardList.length === 0) {
    return NextResponse.json({ ok: true, suggestions: [], message: "TODO / DOING 都空、林董你好閒" });
  }

  const modelName = await getModelNameForUsage("admin_assistant", "claude-haiku-4-5-20251001");
  const provider = providerFromModel(modelName);
  const apiKey = await getProviderKey(provider);
  if (!apiKey) return NextResponse.json({ error: `no_${provider}_key` }, { status: 503 });
  tlog(`apiKey + model ready, model=${modelName}, provider=${provider}`);

  const prompt = `你是雪鑰、AI 島的 AI 助手。林董開了 launchpad 看板、問你：「下一個該做什麼？」

# 待辦卡片（${cardList.length} 張、TODO + DOING）
${cardList.map((c, i) => `${i + 1}. [${c.id}] ${c.title}${c.category ? ` (${c.category})` : ""}${c.description ? `\n   → ${c.description}` : ""}`).join("\n")}

# 任務
從上面 ${cardList.length} 張卡裡、挑出「**最該優先做的 3 張**」、給林董具體理由。

# 判斷標準
1. ROI：影響面 / 工時比、學員一進來就用到的優先
2. 阻塞：別的事在等這個做完
3. bug > feature：bug 優先
4. 林董最近講過很在意的（看內容語意）

# 輸出（嚴格 JSON、無 markdown）
{
  "suggestions": [
    { "card_id": "uuid", "rank": 1, "reason": "30 字內、講為什麼這個排第一" },
    { "card_id": "uuid", "rank": 2, "reason": "30 字內" },
    { "card_id": "uuid", "rank": 3, "reason": "30 字內" }
  ],
  "overall": "1-2 句總結（80 字內）、給林董整體建議"
}`;

  try {
    // 用 callAI provider-aware、不寫死 anthropic
    // 這是 launchpad 502 的 root cause：之前 hardcode anthropic、但
    // admin_assistant usage 設成 gpt-4o、Anthropic 收 gpt-4o 不認 → 4xx → 502
    const r = await callAI({
      provider,
      model: modelName,
      apiKey,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      maxTokens: 600,
    });
    tlog(`${provider} response received, text len=${r.text.length}`);
    const text = r.text.trim();
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return NextResponse.json({ error: "no_json_in_response", raw: text.slice(0, 300) }, { status: 500 });
    const parsed = JSON.parse(m[0]);
    // 補卡片 title 給前端方便顯示
    const enriched = (parsed.suggestions ?? []).map((s: any) => {
      const card = cardList.find((c) => c.id === s.card_id);
      return { ...s, title: card?.title ?? "(找不到)", category: card?.category };
    });
    return NextResponse.json({ ok: true, suggestions: enriched, overall: parsed.overall ?? "" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "ai_failed" }, { status: 500 });
  }
}
