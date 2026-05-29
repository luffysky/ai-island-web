import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getProviderKey } from "@/lib/ai-crypto";
import { getModelNameForUsage } from "@/lib/ai-usage-models";
import { loadUserMemory } from "@/lib/user-ai-memory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * 雪鑰個人化訂閱推薦 — POST
 * 看 user 進度 / AI 對話量 / 連勝 / 章節廣度、推薦最適合的方案 + 個人化理由
 *
 * 回 { recommended: "single"|"monthly"|"yearly", reason, urgency: "low"|"med"|"high" }
 */
export async function POST() {
  try {
    return await handle();
  } catch (e: any) {
    console.error("[subscription-recommend] uncaught:", e?.stack || e?.message || e);
    return NextResponse.json({ error: e?.message?.slice(0, 200) ?? "internal_error" }, { status: 500 });
  }
}

async function handle() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();

  // 撈 user 基本狀態
  const [{ data: profile }, { count: lessonCount }, { count: chapterCount }, { count: aiCount }, { data: latestSub }] = await Promise.all([
    admin.from("profiles").select("username, display_name, level, xp, streak_days, created_at").eq("id", user.id).maybeSingle(),
    admin.from("lesson_progress").select("lesson_id", { count: "exact", head: true }).eq("user_id", user.id),
    admin.from("lesson_progress").select("chapter_id", { count: "exact", head: true }).eq("user_id", user.id),
    admin.from("ai_messages").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    admin.from("subscriptions").select("plan, status, end_date").eq("user_id", user.id).eq("status", "active").maybeSingle(),
  ] as any);

  // 跨表 distinct chapter
  const { data: distChapters } = await admin
    .from("lesson_progress")
    .select("chapter_id")
    .eq("user_id", user.id);
  const distinctChapters = new Set(((distChapters ?? []) as any[]).map((r) => r.chapter_id)).size;

  // 已訂閱者：直接告知不需要再推
  if ((latestSub as any)?.status === "active") {
    return NextResponse.json({
      ok: true,
      already_subscribed: true,
      current_plan: (latestSub as any).plan,
      message: "你已是 Premium、無需推薦。",
    });
  }

  const memory = await loadUserMemory(user.id).catch(() => null);
  const daysSinceJoin = profile ? Math.floor((Date.now() - new Date((profile as any).created_at).getTime()) / 86400_000) : 0;

  // 規則 fallback（AI 不可用時也能回推薦）
  const ruleBased = ruleRecommend({
    lessonCount: lessonCount ?? 0,
    distinctChapters,
    aiCount: aiCount ?? 0,
    streak: (profile as any)?.streak_days ?? 0,
    level: (profile as any)?.level ?? 1,
    daysSinceJoin,
  });

  const apiKey = await getProviderKey("anthropic");
  if (!apiKey) {
    return NextResponse.json({ ok: true, ai: false, ...ruleBased });
  }
  const modelName = await getModelNameForUsage("admin_assistant", "claude-haiku-4-5-20251001");

  const userName = (profile as any)?.display_name || (profile as any)?.username || "你";

  const prompt = `你是雪鑰、AI 島常駐 AI。為 ${userName} 推薦最適合的訂閱方案。

# 學員現況
- 已加入 ${daysSinceJoin} 天
- Lv ${(profile as any)?.level ?? 1}、XP ${(profile as any)?.xp ?? 0}
- 完成 lesson：${lessonCount ?? 0}（覆蓋 ${distinctChapters} 個不同章節）
- AI 對話訊息：${aiCount ?? 0} 條
- 連勝：${(profile as any)?.streak_days ?? 0} 天
${memory?.summary ? `- 雪鑰記憶：${memory.summary}` : ""}
${memory?.preferences?.style ? `- 風格：${memory.preferences.style}` : ""}

# 3 個方案
- single：單章 NT$ 99 一次性、只想學特定 1-2 章的人
- monthly：月訂 NT$ 299 / 月、想完整學但保留彈性、新手 / 試試水的人
- yearly：年訂 NT$ 2999 / 年（省 16% + 1000 z 幣 + VIP 寵物 + 優先客服）、確定要學完整全端 + AI 的人

# 任務
判斷最適合 ${userName} 的方案、給「個人化理由」（為什麼推這個給「你」、不要說空話）。

# 輸出（嚴格 JSON、無 markdown）
{
  "recommended": "single 或 monthly 或 yearly",
  "reason": "60 字內、第二人稱、雪鑰語氣、引用具體數字（如「你已學 X 章」「對話 Y 條」）",
  "urgency": "low 或 med 或 high",
  "alt": "若不選 recommended、第二適合的方案 id"
}

判斷規則：
- 完成 0-3 個 lesson、daysSinceJoin < 7 → 還在試水、推 monthly（彈性）
- 完成 < 10 lesson、只 1-2 章節 → single 或 monthly（看價值感）
- 已完成 ≥ 10 lesson 且 chapter ≥ 3 → 認真學員、推 yearly（省錢 + bonus）
- AI 對話 ≥ 50 條 → 很愛用 AI、yearly（免 quota 焦慮）
- 連勝 ≥ 7 → 習慣養成、推 yearly`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: modelName, max_tokens: 400, temperature: 0.3, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return NextResponse.json({ ok: true, ai: false, ai_error: `${res.status}`, ...ruleBased });
    }
    const data = await res.json();
    const text = (data.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("").trim();
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return NextResponse.json({ ok: true, ai: false, ai_error: "no_json", ...ruleBased });
    const parsed = JSON.parse(m[0]);
    const valid = ["single", "monthly", "yearly"].includes(parsed.recommended) ? parsed.recommended : ruleBased.recommended;
    const altValid = ["single", "monthly", "yearly"].includes(parsed.alt) ? parsed.alt : (valid === "yearly" ? "monthly" : "yearly");
    return NextResponse.json({
      ok: true,
      ai: true,
      recommended: valid,
      reason: String(parsed.reason ?? ruleBased.reason).slice(0, 200),
      urgency: ["low", "med", "high"].includes(parsed.urgency) ? parsed.urgency : ruleBased.urgency,
      alt: altValid,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: true, ai: false, ai_error: e?.message, ...ruleBased });
  }
}

function ruleRecommend(s: { lessonCount: number; distinctChapters: number; aiCount: number; streak: number; level: number; daysSinceJoin: number }) {
  if (s.lessonCount >= 10 && s.distinctChapters >= 3) {
    return {
      recommended: "yearly",
      reason: `你已完成 ${s.lessonCount} 課覆蓋 ${s.distinctChapters} 章、明顯認真學、年訂省 16% + 送 1000 z 幣最划算。`,
      urgency: s.streak >= 7 ? "high" : "med",
      alt: "monthly",
    };
  }
  if (s.aiCount >= 50) {
    return {
      recommended: "yearly",
      reason: `你跟 AI 聊了 ${s.aiCount} 條、用很兇、年訂無 quota 焦慮 + 送 1000 z 幣最划算。`,
      urgency: "med",
      alt: "monthly",
    };
  }
  if (s.lessonCount < 5 && s.daysSinceJoin < 7) {
    return {
      recommended: "monthly",
      reason: `你剛加入 ${s.daysSinceJoin} 天、月訂保留彈性、確定要學完整再升級年訂。`,
      urgency: "low",
      alt: "single",
    };
  }
  return {
    recommended: "monthly",
    reason: `已學 ${s.lessonCount} 課、月訂 NT$ 299 解鎖完整 76 章 + 無限 AI、是性價比最高的入口。`,
    urgency: "med",
    alt: "yearly",
  };
}
