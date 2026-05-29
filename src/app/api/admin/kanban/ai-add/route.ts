import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getProviderKey } from "@/lib/ai-crypto";
import { getModelNameForUsage } from "@/lib/ai-usage-models";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const CATEGORIES = [
  "line_student", "line_admin", "tg", "discord",
  "web_front", "web_admin", "ai", "cron",
  "content", "idea", "bug", "refactor", "marketing",
];

/**
 * AI 自動分類 — POST 收一段話、AI 解析成 title/description/category、自動建卡
 *
 * Body: { text: string, target_board?: "todo" | "wishlist" }
 *   target_board 不給就 AI 自己判斷（idea / bug → wishlist or todo）
 */
export async function POST(req: NextRequest) {
  try {
    return await handle(req);
  } catch (e: any) {
    console.error("[kanban/ai-add] uncaught:", e?.stack || e?.message || e);
    return NextResponse.json({
      error: e?.message ? `internal_error: ${String(e.message).slice(0, 200)}` : "internal_error",
    }, { status: 500 });
  }
}

async function handle(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: p } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  if (!(p as any)?.is_owner && !["admin", "owner"].includes((p as any)?.role ?? "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as any));
  const text = String(body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "missing_text" }, { status: 400 });
  const targetBoard = body.target_board === "wishlist" ? "wishlist" : (body.target_board === "todo" ? "todo" : null);

  const apiKey = await getProviderKey("anthropic");
  if (!apiKey) return NextResponse.json({ error: "no_anthropic_key" }, { status: 503 });
  const modelName = await getModelNameForUsage("admin_assistant", "claude-haiku-4-5-20251001");

  const prompt = `你是雪鑰、AI 島的 AI 助手。林董給你一段話、要建一張看板卡片。

# 輸入
${text}

# 任務
解析成結構化卡片。

# 輸出（嚴格 JSON、無 markdown）
{
  "title": "卡片標題、30 字內、動詞開頭（如「做 X」「修 X」「想 X」）",
  "description": "1-2 句更詳細描述、120 字內、可以為空",
  "category": "從這 13 個選 1：${CATEGORIES.join(" / ")}",
  "target_board": "todo（要做的事）或 wishlist（純想法、可能要再評估）",
  "labels": ["最多 3 個標籤、選填、英文 lowercase 連字號"]
}

判斷 target_board 規則：
- 林董明確說「想做 / 要做」「待辦」「修 X」「加 X」→ todo
- 林董說「我想 / 點子 / 將來 / 也許 / 如果...就好」→ wishlist
- 不確定 → wishlist（保守）`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 400,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json({ error: `anthropic ${res.status}: ${errBody.slice(0, 200)}` }, { status: 502 });
    }
    const data = await res.json();
    const responseText = (data.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("").trim();
    const m = responseText.match(/\{[\s\S]*\}/);
    if (!m) return NextResponse.json({ error: "no_json_in_response", raw: responseText.slice(0, 300) }, { status: 500 });
    const parsed = JSON.parse(m[0]);

    // 用 AI 判斷或 caller 指定的 board
    const finalBoard = targetBoard ?? (parsed.target_board === "todo" ? "todo" : "wishlist");
    const finalCategory = CATEGORIES.includes(parsed.category) ? parsed.category : null;

    // 找對應 column（todo→TODO、wishlist→想法）
    const admin = createSupabaseAdmin();
    const { data: board } = await admin.from("admin_kanban_boards").select("id").eq("slug", finalBoard).maybeSingle();
    if (!board) return NextResponse.json({ error: `board ${finalBoard} not found` }, { status: 500 });
    const targetColTitle = finalBoard === "todo" ? "TODO" : "想法";
    const { data: col } = await admin.from("admin_kanban_columns")
      .select("id").eq("board_id", (board as any).id).eq("title", targetColTitle).maybeSingle();
    if (!col) return NextResponse.json({ error: `column ${targetColTitle} not found` }, { status: 500 });

    // 算 position
    const { count } = await admin.from("admin_kanban_cards")
      .select("id", { count: "exact", head: true }).eq("column_id", (col as any).id);

    const { data: card, error } = await admin.from("admin_kanban_cards").insert({
      column_id: (col as any).id,
      title: String(parsed.title ?? text.slice(0, 50)).slice(0, 200),
      description: parsed.description ? String(parsed.description).slice(0, 4000) : null,
      category: finalCategory,
      labels: Array.isArray(parsed.labels) ? parsed.labels.slice(0, 3).map((l: any) => String(l).slice(0, 50)) : [],
      position: count ?? 0,
    }).select("*").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, card, parsed: { board: finalBoard, ai: parsed } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "ai_failed" }, { status: 500 });
  }
}
