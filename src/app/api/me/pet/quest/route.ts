import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getProviderKey } from "@/lib/ai-crypto";
import { getModelNameForUsage } from "@/lib/ai-usage-models";
import { callAI } from "@/lib/ai-providers";
import { loadUserMemory } from "@/lib/user-ai-memory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 20;

function providerFromModel(model: string): "anthropic" | "openai" | "google" | "groq" {
  if (/^claude/i.test(model)) return "anthropic";
  if (/^gemini/i.test(model)) return "google";
  if (/^(llama|mixtral)/i.test(model)) return "groq";
  return "openai";
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

/** GET — 拿今日寵物 quest（沒今天的就生新的） */
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data: pet } = await admin.from("pets").select("*").eq("user_id", user.id).maybeSingle();
  if (!pet) return NextResponse.json({ error: "no_pet" }, { status: 404 });

  const today = todayISO();
  const existing = (pet as any).daily_quest;
  if (existing && existing.date === today) {
    return NextResponse.json({ ok: true, quest: existing, generated: false });
  }

  // 生成今日 quest
  const memory = await loadUserMemory(user.id).catch(() => null);

  // 扣 pet_quest_gen quota（free 30/月、夠每天 1 個）
  // 達上限不擋、只是不再用 AI 生個性化、改隨機模板
  const { requireAiAction } = await import("@/lib/ai-gate");
  const quotaGate = await requireAiAction(user.id, "pet_quest_gen");
  const skipAiGen = !quotaGate.ok;
  const { data: profile } = await admin.from("profiles").select("level, streak_days, leetcode_username").eq("id", user.id).maybeSingle();

  const TEMPLATES = [
    { category: "lesson",   title: "今天學 1 課", description: "完成任何 1 個 lesson", target: 1, reward_z: 10, reward_affinity: 5 },
    { category: "lesson",   title: "連續 2 課",  description: "今天完成 2 個 lesson", target: 2, reward_z: 20, reward_affinity: 8 },
    { category: "quiz",     title: "做一次每日 quiz", description: "去 /me/quiz 做今日測驗", target: 1, reward_z: 15, reward_affinity: 5 },
    { category: "streak",   title: "簽到別斷", description: "今天記得簽到", target: 1, reward_z: 5, reward_affinity: 3 },
    { category: "review",   title: "複習 1 章", description: "回去看你以前的 1 章重點", target: 1, reward_z: 10, reward_affinity: 5 },
    { category: "leetcode", title: "解 1 題 leetcode", description: "去 leetcode 解 1 題（綁定後同步）", target: 1, reward_z: 25, reward_affinity: 10 },
    { category: "interview", title: "練習面試", description: "去 /me/mock-interview 跟雪鑰面 1 場", target: 1, reward_z: 20, reward_affinity: 8 },
  ];

  let quest: any = null;
  const apiKey = await getProviderKey("anthropic").catch(() => null);
  if (apiKey) {
    try {
      const modelName = await getModelNameForUsage("pet", "claude-haiku-4-5-20251001");
      const provider = providerFromModel(modelName);
      const key2 = await getProviderKey(provider);
      if (key2) {
        const prompt = `你是 ${(pet as any).name}、${(pet as any).species ?? "寵物"}、AI 島學員的寵物。
今天要給主人一個「每日任務」、用寵物口氣（撒嬌 / 拐他學習）。

# 主人狀態
- Lv ${(profile as any)?.level ?? 1}
- 連勝 ${(profile as any)?.streak_days ?? 0} 天
- 綁定 LeetCode: ${(profile as any)?.leetcode_username ? "有" : "沒"}
${memory?.summary ? `- 雪鑰記憶：${memory.summary}` : ""}

# 候選模板
${TEMPLATES.map((t, i) => `${i}. [${t.category}] ${t.title} — ${t.description}（獎 ${t.reward_z} z / 親密 +${t.reward_affinity}）`).join("\n")}

# 任務
從上面選 1 個最適合主人現在的、然後用寵物口氣改寫 title / description（30 字內、撒嬌 + 拐學）。

# 輸出（嚴格 JSON、無 markdown）
{ "template_index": 0-${TEMPLATES.length - 1} 整數, "title": "...", "description": "..." }`;

        const r = await callAI({
          provider, model: modelName, apiKey: key2,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.6, maxTokens: 200,
        });
        const text = r.text.trim();
        const m = text.match(/\{[\s\S]*\}/);
        if (m) {
          const parsed = JSON.parse(m[0]);
          const idx = Math.max(0, Math.min(TEMPLATES.length - 1, Number(parsed.template_index)));
          const t = TEMPLATES[idx];
          quest = {
            date: today,
            title: String(parsed.title ?? t.title).slice(0, 50),
            description: String(parsed.description ?? t.description).slice(0, 200),
            category: t.category,
            target: t.target,
            progress: 0,
            completed: false,
            reward_z: t.reward_z,
            reward_affinity: t.reward_affinity,
            created_at: new Date().toISOString(),
          };
        }
      }
    } catch { /* fallback 下面隨機 */ }
  }

  if (!quest) {
    const t = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
    quest = {
      date: today,
      title: t.title,
      description: t.description,
      category: t.category,
      target: t.target,
      progress: 0,
      completed: false,
      reward_z: t.reward_z,
      reward_affinity: t.reward_affinity,
      created_at: new Date().toISOString(),
    };
  }

  await admin.from("pets").update({ daily_quest: quest }).eq("user_id", user.id);
  return NextResponse.json({ ok: true, quest, generated: true });
}

/** POST { action: "complete" } — 標記完成 + 發獎 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  if (body.action !== "complete") return NextResponse.json({ error: "unknown action" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: pet } = await admin.from("pets").select("*").eq("user_id", user.id).maybeSingle();
  if (!pet) return NextResponse.json({ error: "no_pet" }, { status: 404 });

  const q = (pet as any).daily_quest;
  if (!q || q.date !== todayISO()) return NextResponse.json({ error: "no_today_quest" }, { status: 400 });
  if (q.completed) return NextResponse.json({ ok: true, message: "已完成過了" });

  // 標記完成
  const updated = { ...q, completed: true, progress: q.target, completed_at: new Date().toISOString() };
  await admin.from("pets").update({
    daily_quest: updated,
    affinity: Math.min(1000, ((pet as any).affinity ?? 0) + (q.reward_affinity ?? 0)),
  }).eq("user_id", user.id);

  // 發 z 幣（用 RPC、跟系統其他發幣一致）
  if (q.reward_z > 0) {
    try {
      await admin.rpc("award_z_coin", { p_user_id: user.id, p_amount: q.reward_z, p_reason: `pet_quest:${q.category}` });
    } catch {}
  }

  return NextResponse.json({ ok: true, quest: updated, reward_z: q.reward_z, reward_affinity: q.reward_affinity });
}
