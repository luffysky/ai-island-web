/**
 * 章節 lesson 友善化批次改寫 — admin only
 *
 * 用 anthropic claude-sonnet 把 analogy / oneLineSummary < 50 字 的 lesson 擴寫
 * 成 80-150 字生活類比版本，寫回 lessons.analogy / one_line_summary。
 *
 * 流程：
 *   - GET ?chapter_ids=28,29,30 → 列出哪些 lesson 需要改、各章節缺口
 *   - POST { chapter_ids, dry_run? } → 跑改寫；dry_run=true 只回傳建議、不寫 DB
 *
 * 用線上 ai_api_keys 的 anthropic key（不污染 .env.local）。
 * 一 batch ~25 lesson、串行跑（Anthropic 沒 batch embed API）、約 25 × 2 秒 = 50 秒/章。
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { decryptKey } from "@/lib/ai-crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase.from("profiles").select("role, id, username, is_owner").eq("id", user.id).maybeSingle();
  if (!p) return null;
  if (p.role !== "admin" && p.role !== "owner" && !(p as any).is_owner) return null;
  return p;
}

async function getAnthropicKey(admin: ReturnType<typeof createSupabaseAdmin>): Promise<string | null> {
  const { data } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled")
    .eq("provider", "anthropic")
    .maybeSingle();
  if (!data || !(data as any).enabled) return null;
  try { return decryptKey((data as any).api_key_encrypted); } catch { return null; }
}

const DEFAULT_REWRITE_MODEL = "claude-sonnet-4-6";  // fallback；後台改 usage_key=rewrite_lessons 即覆蓋
const MIN_ANALOGY_LEN = 50;

function buildRewritePrompt(lesson: any): string {
  return `你正在改寫 AI 島（程式教學平台）的章節 lesson、目的是新手友善化。

# Lesson 資訊
- Chapter: ${lesson.chapter_id}
- Lesson: ${lesson.number} ${lesson.title}
- 一句話摘要: ${lesson.one_line_summary || "(none)"}
- 目前 analogy: ${lesson.analogy || "(none)"}

# 主要 content（節選）
${(lesson.content || "").slice(0, 1500)}

# 任務
重寫 analogy 欄位、80-150 字：
- 用日常生活類比（廚房 / 便利商店 / 文具盒 / 樂高 / 遊戲 / 國中生熟悉的事物）
- 不直接丟 jargon、先說「這是在做什麼」再用術語
- 繁體中文台灣口語、不要太文藝
- 像學長學姊聊天的口吻
- 避免「顯然」「應該都知道」「很簡單」這種貶低詞
- 如果已經有好類比、就強化它（不要完全推翻）

# 輸出格式（嚴格）
只回傳 JSON：
{"analogy": "新的 80-150 字 analogy"}

不要任何解釋、不要 markdown、不要 \`\`\`、直接 JSON。`;
}

async function rewriteOne(apiKey: string, lesson: any): Promise<{ analogy?: string; error?: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
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
        model: await (await import("@/lib/ai-usage-models")).getModelNameForUsage("rewrite_lessons", DEFAULT_REWRITE_MODEL),
        max_tokens: 400,
        temperature: 0.8,
        messages: [{ role: "user", content: buildRewritePrompt(lesson) }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { error: `${res.status}: ${err.slice(0, 200)}` };
    }
    const data = await res.json();
    const text = (data.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("").trim();
    // 抽 JSON（怕 AI 加 markdown）
    const m = text.match(/\{[\s\S]*"analogy"[\s\S]*?\}/);
    if (!m) return { error: `parse failed: ${text.slice(0, 200)}` };
    const parsed = JSON.parse(m[0]);
    if (!parsed.analogy || typeof parsed.analogy !== "string") {
      return { error: "no analogy field in response" };
    }
    return { analogy: parsed.analogy.trim() };
  } catch (e: any) {
    return { error: e?.message ?? "unknown" };
  } finally {
    clearTimeout(timer);
  }
}

// GET — 哪些 lesson 需要改寫
export async function GET(req: NextRequest) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const chapterIdsParam = req.nextUrl.searchParams.get("chapter_ids") ?? "28,29,30";
  const chapterIds = chapterIdsParam.split(",").map((s) => Number(s.trim())).filter(Boolean);
  if (chapterIds.length === 0) {
    return NextResponse.json({ error: "no chapter_ids" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: lessons, error } = await admin
    .from("lessons")
    .select("id, chapter_id, number, title, one_line_summary, analogy")
    .in("chapter_id", chapterIds)
    .order("chapter_id", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const summary: Record<number, { total: number; needs_rewrite: number; lessons: any[] }> = {};
  for (const id of chapterIds) summary[id] = { total: 0, needs_rewrite: 0, lessons: [] };

  for (const l of (lessons ?? []) as any[]) {
    const s = summary[l.chapter_id];
    s.total++;
    const len = (l.analogy ?? "").length;
    if (len < MIN_ANALOGY_LEN) {
      s.needs_rewrite++;
      s.lessons.push({ id: l.id, title: l.title, current: l.analogy, len });
    }
  }
  return NextResponse.json({ summary, model: REWRITE_MODEL });
}

// POST { chapter_ids: number[], dry_run?: boolean, limit?: number }
export async function POST(req: NextRequest) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const chapterIds = Array.isArray(body.chapter_ids) ? body.chapter_ids.map(Number).filter(Boolean) : [28, 29, 30];
  const dryRun = !!body.dry_run;
  const limit = Math.max(1, Math.min(100, Number(body.limit) || 100));

  const admin = createSupabaseAdmin();
  const apiKey = await getAnthropicKey(admin);
  if (!apiKey) {
    return NextResponse.json({
      error: "no_anthropic_key",
      hint: "去 /admin/ai/models 啟用 anthropic provider key",
    }, { status: 400 });
  }

  const { data: lessons, error } = await admin
    .from("lessons")
    .select("id, chapter_id, number, title, one_line_summary, analogy, content")
    .in("chapter_id", chapterIds)
    .order("chapter_id", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const targets = ((lessons ?? []) as any[]).filter((l) => (l.analogy ?? "").length < MIN_ANALOGY_LEN).slice(0, limit);

  const results: any[] = [];
  let done = 0;
  let failed = 0;
  for (const lesson of targets) {
    const r = await rewriteOne(apiKey, lesson);
    if (r.error) {
      failed++;
      results.push({ id: lesson.id, title: lesson.title, status: "failed", error: r.error });
      continue;
    }
    if (!dryRun) {
      const { error: upErr } = await admin
        .from("lessons")
        .update({ analogy: r.analogy })
        .eq("id", lesson.id);
      if (upErr) {
        failed++;
        results.push({ id: lesson.id, title: lesson.title, status: "failed", error: upErr.message });
        continue;
      }
    }
    done++;
    results.push({
      id: lesson.id,
      title: lesson.title,
      status: dryRun ? "dry_run" : "applied",
      old: lesson.analogy,
      new: r.analogy,
    });
  }

  return NextResponse.json({
    ok: true,
    dry_run: dryRun,
    chapter_ids: chapterIds,
    model: REWRITE_MODEL,
    total_targets: targets.length,
    done,
    failed,
    results,
  });
}
