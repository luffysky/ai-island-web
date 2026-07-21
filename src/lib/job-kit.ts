/**
 * AI 求職包共用邏輯：自傳 / 求職信 的資料撈取 + prompt 組裝 + AI 產出。
 * 履歷(/me/resume)、面試模擬(/me/mock-interview)已存在；這裡補「自傳」「求職信」。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProviderKey } from "./ai-crypto";
import { getModelNameForUsage } from "./ai-usage-models";
import { callAI } from "./ai-providers";

export function providerFromModel(model: string): "anthropic" | "openai" | "google" | "groq" {
  if (/^claude/i.test(model)) return "anthropic";
  if (/^gemini/i.test(model)) return "google";
  if (/^(llama|mixtral)/i.test(model)) return "groq";
  return "openai";
}

export type CareerData = {
  name: string;
  bio: string | null;
  daysSinceJoin: number;
  level: number;
  chapters: Array<{ id: number; title: string; count: number }>;
  lessonCount: number;
  leetcode: { username: string | null; total: number };
  portfolios: Array<{ title: string; description?: string }>;
  certCount: number;
};

/** 撈使用者的學習/作品資料（自傳/求職信共用；比 resume 輕量）。 */
export async function loadCareerData(admin: SupabaseClient, userId: string): Promise<CareerData> {
  const [{ data: profile }, lessonsRes, { data: portfolios }, { count: certCount }] = await Promise.all([
    admin.from("profiles").select("username, display_name, level, leetcode_username, leetcode_stats, created_at, bio").eq("id", userId).maybeSingle(),
    admin.from("lesson_progress").select("chapter_id").eq("user_id", userId).limit(500),
    admin.from("portfolios").select("title, description").eq("user_id", userId).eq("is_public", true).limit(20),
    admin.from("certificates").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ] as any);

  // 每章完成節數（不用 PostgREST embed、改兩段查更穩）
  const lessons = (lessonsRes.data ?? []) as any[];
  const counts: Record<number, number> = {};
  for (const l of lessons) if (l.chapter_id) counts[l.chapter_id] = (counts[l.chapter_id] ?? 0) + 1;
  const ids = Object.keys(counts).map(Number);
  const titles: Record<number, string> = {};
  if (ids.length) {
    const { data: chs } = await admin.from("chapters").select("id, title").in("id", ids);
    for (const c of (chs ?? []) as any[]) titles[c.id] = c.title;
  }
  const chapters = ids
    .map((id) => ({ id, title: titles[id] ?? `Ch${id}`, count: counts[id] }))
    .sort((a, b) => b.count - a.count);

  const p = (profile ?? {}) as any;
  const stats = p.leetcode_stats ?? {};
  return {
    name: p.display_name || p.username || "AI 島學員",
    bio: p.bio ?? null,
    daysSinceJoin: p.created_at ? Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400_000) : 0,
    level: p.level ?? 1,
    chapters,
    lessonCount: lessons.length,
    leetcode: { username: p.leetcode_username ?? null, total: stats.totalSolved ?? 0 },
    portfolios: (portfolios ?? []) as any[],
    certCount: certCount ?? 0,
  };
}

function dataBlock(d: CareerData): string {
  return [
    `- 姓名：${d.name}`,
    d.bio ? `- 自介：${d.bio}` : "",
    `- 加入學習平台 ${d.daysSinceJoin} 天、Lv ${d.level}`,
    `- 完成 ${d.chapters.length} 章 / ${d.lessonCount} 節課`,
    d.chapters.length ? `- 主要學過：${d.chapters.slice(0, 8).map((c) => c.title).join("、")}` : "",
    d.leetcode.total ? `- LeetCode 解題 ${d.leetcode.total} 題（${d.leetcode.username ?? ""}）` : "",
    d.portfolios.length ? `- 作品：${d.portfolios.map((p) => p.title).join("、")}` : "",
    d.certCount ? `- 完課證書 ${d.certCount} 張` : "",
  ].filter(Boolean).join("\n");
}

export function hasAnyCareerData(d: CareerData): boolean {
  return d.lessonCount > 0 || d.leetcode.total > 0 || d.portfolios.length > 0 || !!d.bio;
}

// ── 自傳 ───────────────────────────────────────────────
export function buildBioPrompt(d: CareerData, focus?: string): string {
  return `你是專業的求職文件寫手，幫使用者寫一份「自傳 / 自我介紹」。

# 使用者資料
${dataBlock(d)}
${focus ? `\n# 使用者想強調的方向\n${focus}` : ""}

# 任務
寫一份約 400–600 字的自傳，適合放進履歷或求職平台。用繁體中文、台灣求職習慣。
結構：① 開頭一句定位 ② 學習/專業歷程 ③ 具體能力與作品 ④ 人格特質與動機 ⑤ 結尾展望。
規則：只根據上面真實資料寫、不捏造經歷或數字；沒資料的段落自然帶過、不要寫「無」；語氣真誠不浮誇。
只輸出自傳本文（可用 markdown 段落）、無前綴說明。`;
}

// ── 求職信 ─────────────────────────────────────────────
export type CoverLetterInput = { company: string; jobTitle: string; jd?: string; highlights?: string };

export function buildCoverLetterPrompt(d: CareerData, input: CoverLetterInput): string {
  return `你是專業的求職文件寫手，幫使用者寫一封「求職信 / cover letter」。

# 應徵資訊
- 公司：${input.company}
- 職位：${input.jobTitle}
${input.jd ? `- 職缺描述 / 要求：\n${input.jd.slice(0, 1500)}` : ""}
${input.highlights ? `- 使用者想強調的亮點：\n${input.highlights}` : ""}

# 使用者背景
${dataBlock(d)}

# 任務
寫一封約 300–450 字的求職信，繁體中文、台灣職場語氣、專業但有溫度。
結構：① 稱謂與應徵職位 ② 為何對這家公司/職位有興趣（扣職缺） ③ 我能帶來什麼（扣背景與亮點、對應職缺要求） ④ 邀約面談的收尾。
規則：只根據真實資料、不捏造；針對「這家公司這個職位」客製、不要罐頭；不誇大。
只輸出求職信本文、無前綴說明。`;
}

// ── AI 產出 ─────────────────────────────────────────────
export async function generateJobKitMarkdown(prompt: string): Promise<
  | { ok: true; markdown: string; model: string; tokens: number }
  | { ok: false; status: number; error: string }
> {
  const model = await getModelNameForUsage("admin_assistant", "claude-sonnet-4-6");
  const provider = providerFromModel(model);
  const apiKey = await getProviderKey(provider);
  if (!apiKey) return { ok: false, status: 503, error: `no_${provider}_key、AI 暫時不可用` };

  try {
    const r = await callAI({
      provider, model, apiKey,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6, maxTokens: 1400,
    });
    const markdown = (r.text ?? "").trim();
    if (!markdown) return { ok: false, status: 502, error: "empty_output" };
    return { ok: true, markdown, model, tokens: (r.tokensInput ?? 0) + (r.tokensOutput ?? 0) };
  } catch (e: any) {
    return { ok: false, status: 500, error: e?.message?.slice(0, 200) ?? "ai_failed" };
  }
}
