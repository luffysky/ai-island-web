import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { completeForUsage } from "@/lib/resolve-usage-ai";
import { loadUserMemory } from "@/lib/user-ai-memory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/me/resources/recommend
 * 雪鑰看 user 的 memory + 進度、推薦 6 個外部資源 + 理由
 */
export async function POST() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { requireAiAction } = await import("@/lib/ai-gate");
  const gate = await requireAiAction(user.id, "resource_rec");
  if (!gate.ok) return NextResponse.json({ error: gate.error, reason: gate.reason }, { status: 429 });

  const admin = createSupabaseAdmin();

  // 撈 user memory + 最近 5 章完成的 chapter title
  const memory = await loadUserMemory(user.id).catch(() => null);
  const { data: profile } = await admin.from("profiles").select("username, display_name, level").eq("id", user.id).maybeSingle();
  const { data: recentChapters } = await admin
    .from("lesson_progress")
    .select("chapter_id, chapters(title)")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(10);
  const recentChapterTitles = ((recentChapters ?? []) as any[])
    .map((r) => r.chapters?.title)
    .filter((x, i, arr) => x && arr.indexOf(x) === i)
    .slice(0, 5);

  // 撈所有 active resources（給 AI 選）
  const { data: resources } = await admin
    .from("external_resources")
    .select("id, title, short_desc, type, source, tags, topics, difficulty, language")
    .eq("active", true);
  const resList = (resources ?? []) as any[];
  if (resList.length === 0) {
    return NextResponse.json({ ok: true, picks: [] });
  }

  const prompt = `你是雪鑰、AI 島的 AI 助手。學員打開外部資源頁、問你「推薦適合我的」。

# 學員背景
- 名字：${profile?.display_name || profile?.username || "未命名學員"}
- Lv ${profile?.level ?? 1}
- 最近學的章節：${recentChapterTitles.length > 0 ? recentChapterTitles.join(" / ") : "（剛起步）"}
${memory?.summary ? `\n# 雪鑰對他的記憶\n${memory.summary}` : ""}
${memory?.preferences?.style ? `# 風格偏好：${memory.preferences.style}` : ""}
${(memory?.preferences?.jargon_familiar?.length ?? 0) > 0 ? `# 已熟悉術語：${memory?.preferences?.jargon_familiar?.slice(0, 5).join(", ")}` : ""}
${(memory?.preferences?.jargon_unfamiliar?.length ?? 0) > 0 ? `# 還在學的術語：${memory?.preferences?.jargon_unfamiliar?.slice(0, 3).join(", ")}` : ""}

# 候選資源（${resList.length} 筆）
${resList.map((r, i) => `${i + 1}. [${r.id}] ${r.title} (${r.type} / ${r.difficulty} / ${r.language}) — ${r.short_desc}`).join("\n")}

# 任務
從上面挑「**最適合這位學員現在的 6 個資源**」、每個給一句不到 30 字的「為什麼推薦給你」、語氣像雪鑰跟朋友講話。

# 輸出（嚴格 JSON、無 markdown）
{
  "picks": [
    { "resource_id": "uuid", "reason": "..." },
    ...
  ]
}`;

  try {
    const { text } = await completeForUsage("admin_assistant", { user: prompt, maxTokens: 1000, temperature: 0.4 });
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return NextResponse.json({ error: "no_json", raw: text.slice(0, 300) }, { status: 500 });
    const parsed = JSON.parse(m[0]);
    return NextResponse.json({ ok: true, picks: (parsed.picks ?? []).slice(0, 6) });
  } catch {
    // AI 全掛（含備援）→ 純規則隨機 6 個
    const shuffled = [...resList].sort(() => Math.random() - 0.5).slice(0, 6);
    return NextResponse.json({
      ok: true,
      picks: shuffled.map((r) => ({ resource_id: r.id, reason: "（AI 不可用、隨機推薦）" })),
      fallback: true,
    });
  }
}
