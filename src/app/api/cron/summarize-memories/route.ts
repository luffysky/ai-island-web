import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getProviderKey, decryptKey } from "@/lib/ai-crypto";
import { getModelNameForUsage } from "@/lib/ai-usage-models";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * 每日 04:00（台灣時間）— AI 總結每個活躍 user 的對話、寫進 user_ai_memory。
 *
 * 觸發：GET /api/cron/summarize-memories?secret=$CRON_SECRET
 * cron-job.org 設「每天 20:00 UTC」(台灣 04:00 凌晨、user 在睡)
 *
 * 篩選對象：過去 24 小時內 ai_messages 數 ≥ 5 的 user
 *           且 user_ai_memory 內 last_summarized_at < 24 小時前（避免重複算）
 *
 * 對每個 user：
 *   1. 撈最近 30 條 ai_messages（user + assistant 都拿）
 *   2. 加上現有 user_ai_memory.summary（增量更新而非重寫）
 *   3. 用 Haiku 4.5 跑 ~500 token output 總結（成本 ~$0.001/user）
 *   4. UPSERT user_ai_memory
 *
 * 失敗策略：個別 user fail 不阻斷其他、寫 error_logs。
 */

type RecentMsg = { role: string; content: string; created_at: string };
type Memory = {
  user_id: string;
  summary?: string | null;
  preferences?: Record<string, any> | null;
  topics?: Array<{ topic: string; count: number }> | null;
};

const SUMMARIZE_PROMPT = `你的任務：用一段話總結某位學員的近期對話狀態、提取偏好、列出關注主題。

# 輸入
- 既有 memory（昨天總結的）：可能為空
- 最近對話：含 user / assistant 多輪

# 輸出（嚴格 JSON、無 markdown、無解釋）
{
  "summary": "30-80 字、繁中口語、第三人稱。內容：最近聊什麼、卡在哪、學到哪、整體進度感覺",
  "preferences": {
    "style": "casual|formal|sarcastic|poetic 之一",
    "tone_hints": ["最多 3 條風格描述、如『愛諷刺』『喜歡哲學類比』『常用 emoji』"],
    "jargon_familiar": ["他已熟悉的英文術語、最多 8 個"],
    "jargon_unfamiliar": ["他卡關的英文術語、最多 5 個"]
  },
  "topics": [
    { "topic": "認證 / OAuth", "count": 3 },
    { "topic": "React state", "count": 2 }
  ]
}

# 規則
- summary 必須是繁體中文台灣口語、不要文謅謅
- 如果既有 memory 有資訊、做「增量更新」、不是覆蓋（保留還相關的、刪除過時的）
- 找不到的欄位用 null、不要編造
- topics 按 count desc 排、最多 8 個`;

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const got = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (!expected || got !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const apiKey = await getProviderKey("anthropic");
  if (!apiKey) {
    return NextResponse.json({ error: "no_anthropic_key" }, { status: 503 });
  }
  const modelName = await getModelNameForUsage("admin_assistant", "claude-haiku-4-5-20251001");

  // 1. 撈活躍 user（過去 24h 對話 ≥ 5 條）
  const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { data: activeRows } = await admin
    .from("ai_messages")
    .select("conversation_id, role, content, created_at, ai_conversations(user_id)")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const byUser = new Map<string, RecentMsg[]>();
  for (const r of (activeRows ?? []) as any[]) {
    const uid = r.ai_conversations?.user_id;
    if (!uid) continue;
    const arr = byUser.get(uid) ?? [];
    arr.push({ role: r.role, content: String(r.content ?? "").slice(0, 1500), created_at: r.created_at });
    byUser.set(uid, arr);
  }

  // 2. 過濾：對話 ≥ 5 + last_summarized_at 距今 ≥ 20h（避免一天內重算）
  const eligible: string[] = [];
  for (const [uid, msgs] of byUser.entries()) {
    if (msgs.length < 5) continue;
    const { data: mem } = await admin
      .from("user_ai_memory")
      .select("last_summarized_at")
      .eq("user_id", uid)
      .maybeSingle();
    const last = (mem as any)?.last_summarized_at ? new Date((mem as any).last_summarized_at).getTime() : 0;
    if (Date.now() - last < 20 * 60 * 60_000) continue;
    eligible.push(uid);
  }

  let ok = 0;
  let failed = 0;
  const results: any[] = [];

  for (const uid of eligible) {
    const msgs = (byUser.get(uid) ?? []).slice(0, 30).reverse();
    try {
      const { data: existing } = await admin
        .from("user_ai_memory")
        .select("summary, preferences, topics, turn_count")
        .eq("user_id", uid)
        .maybeSingle();
      const existingMem: Memory = {
        user_id: uid,
        summary: (existing as any)?.summary ?? null,
        preferences: (existing as any)?.preferences ?? null,
        topics: (existing as any)?.topics ?? null,
      };

      const userBlock = `既有 memory（昨天總結）:
${JSON.stringify(existingMem, null, 2)}

最近對話（${msgs.length} 條、時序由舊到新）:
${msgs.map((m) => `[${m.role}] ${m.content.slice(0, 800)}`).join("\n")}`;

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30_000);
      let parsed: any;
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          signal: ctrl.signal,
          body: JSON.stringify({
            model: modelName,
            max_tokens: 700,
            temperature: 0.3,
            system: SUMMARIZE_PROMPT,
            messages: [{ role: "user", content: userBlock }],
          }),
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`anthropic ${res.status}: ${body.slice(0, 200)}`);
        }
        const data = await res.json();
        const text = (data.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("").trim();
        const m = text.match(/\{[\s\S]*\}/);
        if (!m) throw new Error(`no JSON in response: ${text.slice(0, 200)}`);
        parsed = JSON.parse(m[0]);
      } finally {
        clearTimeout(timer);
      }

      const newTurnCount = ((existing as any)?.turn_count ?? 0) + msgs.length;
      const { error: upErr } = await admin
        .from("user_ai_memory")
        .upsert({
          user_id: uid,
          summary: parsed.summary ?? null,
          preferences: parsed.preferences ?? {},
          topics: parsed.topics ?? [],
          turn_count: newTurnCount,
          last_summarized_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      if (upErr) throw new Error(`upsert: ${upErr.message}`);

      ok++;
      results.push({ user_id: uid, status: "ok", msgs: msgs.length, summary_len: parsed.summary?.length ?? 0 });
    } catch (e: any) {
      failed++;
      try {
        await admin.from("error_logs").insert({
          source: "cron/summarize-memories",
          level: "error",
          message: `[summarize_user_failed] ${e?.message ?? "unknown"}`,
          extra: { user_id: uid, stack: e?.stack?.slice(0, 800) },
        });
      } catch {}
      results.push({ user_id: uid, status: "failed", error: e?.message });
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: byUser.size,
    eligible: eligible.length,
    summarized: ok,
    failed,
    results: results.slice(0, 50),
  });
}
