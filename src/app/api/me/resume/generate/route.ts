import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getProviderKey } from "@/lib/ai-crypto";
import { getModelNameForUsage } from "@/lib/ai-usage-models";
import { callAI } from "@/lib/ai-providers";
import { loadUserMemory } from "@/lib/user-ai-memory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function providerFromModel(model: string): "anthropic" | "openai" | "google" | "groq" {
  if (/^claude/i.test(model)) return "anthropic";
  if (/^gemini/i.test(model)) return "google";
  if (/^(llama|mixtral)/i.test(model)) return "groq";
  return "openai";
}

/**
 * 雪鑰看學員學習數據生成 markdown 履歷
 * POST { target?: "indie" | "junior" | "senior" | "freelance" }
 * 回 { markdown }
 */
export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (e: any) {
    console.error("[resume/generate] uncaught:", e?.stack || e?.message || e);
    return NextResponse.json({ error: e?.message?.slice(0, 200) ?? "internal_error" }, { status: 500 });
  }
}

async function handle(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // AI gate（特權跳過、Free 看月 quota：resume 3/月）
  const { requireAiAction, consumeAiTokens } = await import("@/lib/ai-gate");
  const gate = await requireAiAction(user.id, "resume");
  if (!gate.ok) return NextResponse.json({ error: gate.error, reason: gate.reason }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const target = ["indie", "junior", "senior", "freelance"].includes(body.target) ? body.target : "junior";

  const admin = createSupabaseAdmin();

  // 撈所有數據
  const [{ data: profile }, lessonsRes, { data: portfolios }, { data: leetcodeBindings }, { count: aiMsgCount }, { data: certs }] = await Promise.all([
    admin.from("profiles").select("username, display_name, level, xp, streak_days, leetcode_username, leetcode_stats, created_at, bio").eq("id", user.id).maybeSingle(),
    admin.from("lesson_progress").select("chapter_id, lesson_id, chapters(title, stage)").eq("user_id", user.id).order("completed_at", { ascending: false }).limit(200),
    admin.from("portfolios").select("title, description, slug, tags").eq("user_id", user.id).eq("is_public", true).limit(20),
    admin.from("profiles").select("leetcode_stats").eq("id", user.id).maybeSingle(),
    // ai_messages 沒有 user_id 欄；用對話數當「AI 互動量」代理（ai_conversations 有 user_id）
    admin.from("ai_conversations").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    admin.from("certificates").select("cert_type, title, issued_at, verification_code").eq("user_id", user.id),
  ] as any);

  const lessons = (lessonsRes.data ?? []) as any[];
  const chaptersDone: Record<number, { title: string; stage: number; count: number }> = {};
  for (const l of lessons) {
    if (!l.chapter_id) continue;
    if (!chaptersDone[l.chapter_id]) {
      chaptersDone[l.chapter_id] = { title: l.chapters?.title ?? `Ch${l.chapter_id}`, stage: l.chapters?.stage ?? 0, count: 0 };
    }
    chaptersDone[l.chapter_id].count++;
  }
  const chapterList = Object.entries(chaptersDone).map(([id, v]) => ({ id: Number(id), ...v }))
    .sort((a, b) => b.count - a.count);

  const memory = await loadUserMemory(user.id).catch(() => null);
  const daysSinceJoin = profile ? Math.floor((Date.now() - new Date((profile as any).created_at).getTime()) / 86400_000) : 0;
  const stats = (profile as any)?.leetcode_stats ?? {};

  const userName = (profile as any)?.display_name || (profile as any)?.username || "AI 島學員";
  const lcUsername = (profile as any)?.leetcode_username;
  const portfolioList = (portfolios ?? []) as any[];
  const certList = (certs ?? []) as any[];

  const targetLabel: Record<string, string> = {
    indie: "獨立開發 / Indie Hacker",
    junior: "Junior 工程師職位",
    senior: "Senior / 業界跳槽",
    freelance: "接案 / freelance",
  };

  // 沒寫 code 就直接 fallback minimal markdown、不打 AI
  if (lessons.length === 0 && (stats?.totalSolved ?? 0) === 0 && portfolioList.length === 0) {
    return NextResponse.json({
      ok: true,
      markdown: `# ${userName}\n\n（還沒累積資料、來 AI 島學一課再生成、雪鑰才有東西寫）\n\n→ https://ai-island-web.snowrealm.pet/chapters`,
    });
  }

  const modelName = await getModelNameForUsage("admin_assistant", "claude-sonnet-4-6");
  const provider = providerFromModel(modelName);
  const apiKey = await getProviderKey(provider);
  if (!apiKey) {
    return NextResponse.json({ error: `no_${provider}_key、AI 不可用、稍後再試` }, { status: 503 });
  }

  const prompt = `你是雪鑰、AI 島常駐 AI、學員 ${userName} 請你幫他生成一份履歷。

# 目標
${targetLabel[target]}

# 學員數據
- 加入 AI 島 ${daysSinceJoin} 天
- Lv ${(profile as any)?.level ?? 1}、累積 ${(profile as any)?.xp ?? 0} XP
- 連勝最長 / 目前 ${(profile as any)?.streak_days ?? 0} 天
- 跟雪鑰對話 ${aiMsgCount ?? 0} 條訊息
- 自介：${(profile as any)?.bio ?? "（沒寫）"}

# 完成的章節（${chapterList.length} 章 / ${lessons.length} lesson）
${chapterList.slice(0, 15).map((ch) => `- Ch${ch.id} ${ch.title}（${ch.count} lesson、Stage ${ch.stage}）`).join("\n")}

# 證書（${certList.length} 張）
${certList.map((c) => `- Ch${c.chapter_id} ${c.chapters?.title} (驗證碼: ${c.verification_code?.slice(0, 8)})`).join("\n") || "（還沒有）"}

# LeetCode (${lcUsername ?? "未綁定"})
${lcUsername ? `- 總解題: ${stats.totalSolved ?? 0} (easy ${stats.easySolved ?? 0} / med ${stats.mediumSolved ?? 0} / hard ${stats.hardSolved ?? 0})\n- Ranking: ${stats.ranking ?? "?"}` : "（未綁定）"}

# 作品集（${portfolioList.length} 件公開）
${portfolioList.map((p) => `- ${p.title}: ${p.description?.slice(0, 80) ?? ""} (${p.url})`).join("\n") || "（還沒有作品）"}

${memory?.summary ? `\n# 雪鑰對他的記憶\n${memory.summary}` : ""}

# 任務
生成一份 **完整的 markdown 履歷**、適合貼到 LinkedIn / GitHub README / 投履歷。

# 結構（按這個寫）
\`\`\`
# {名字}
> {一句話 tagline 自介、20 字內}

## 🎯 我擅長什麼
- {從章節 + LeetCode 推、列 3-5 條具體技能、不要空話}

## 📚 學習軌跡
- {從章節列表挑最值得提的 5-8 章、簡述學了什麼}

## 💻 LeetCode {如有綁定}
- {總題數 / 三難度 / ranking}

## 🛠️ 作品 {如有}
- {作品條目、含連結}

## 🏆 證書 {如有}
- {證書 + 驗證碼}

## 💬 為什麼選我
- {根據目標、寫 2-3 條 selling point、像給 HR 看的}
\`\`\`

# 規則
- 繁體中文、台灣口語
- 不要假數據、學員真的有什麼就寫什麼
- 沒有的 section 就 skip、不要寫「無」
- selling point 寫「具體事實」而非空話
- 整體 300-500 字、可掃讀

只輸出 markdown、無 \`\`\` wrap、無前綴。`;

  try {
    const r = await callAI({
      provider,
      model: modelName,
      apiKey,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      maxTokens: 1500,
    });
    const md = r.text.trim();
    if (gate.chargeable && (r.tokensInput + r.tokensOutput) > 0) {
      await consumeAiTokens(user.id, r.tokensInput + r.tokensOutput);
    }
    return NextResponse.json({ ok: true, markdown: md, target, model: modelName });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "ai_failed" }, { status: 500 });
  }
}
