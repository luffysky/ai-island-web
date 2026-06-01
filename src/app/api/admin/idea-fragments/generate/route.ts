import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { callAI } from "@/lib/ai-providers";
import { rateLimit } from "@/lib/rate-limit";
import { resolveIdeaModel, extractJson } from "@/lib/idea-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;

const IDEA_TYPES = ["產品", "故事", "行銷", "功能", "品牌", "歌曲", "課程"];

/**
 * POST /api/admin/idea-fragments/generate  { fragmentIds?: string[], count?: number }
 *   從碎片重組出 3~5 個新點子、存進 generated_ideas（saved=false）、回 { ideas }
 *   沒給 fragmentIds → 取最近 40 個碎片
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  if (!(profile?.role === "admin" || (profile as any)?.is_owner === true)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const rl = rateLimit(`idea-generate:${user.id}`, 30, 3600_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", retry_after: rl.retryAfter }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const count = Math.min(Math.max(Number(body.count) || 3, 1), 5);
  const fragmentIds: string[] = Array.isArray(body.fragmentIds) ? body.fragmentIds.map(String) : [];

  const admin = createSupabaseAdmin();
  let q = admin.from("idea_fragments").select("id, title, content, tags, mood, category").order("created_at", { ascending: false });
  if (fragmentIds.length > 0) q = q.in("id", fragmentIds);
  else q = q.limit(40);

  const { data: frags } = await q;
  const fragments = (frags as any[]) ?? [];
  if (fragments.length < 2) {
    return NextResponse.json({ error: "not_enough_fragments", message: "至少要 2 個碎片才能重組點子" }, { status: 400 });
  }

  const resolved = await resolveIdeaModel();
  if (!resolved.ok) return NextResponse.json({ error: resolved.error, message: resolved.message }, { status: resolved.status });

  const fragmentBlock = fragments
    .map((f) => {
      const meta = [f.category, f.mood, ...(f.tags ?? [])].filter(Boolean).join(" / ");
      return `[#${f.id}] ${f.title}${meta ? `（${meta}）` : ""}\n${(f.content || "").slice(0, 800)}`;
    })
    .join("\n\n");

  const system = `你是一個創意重組引擎，語氣像一位敏銳的創意顧問，不是筆記軟體。

以下是使用者長期收集的人生碎片、專案想法與靈感紀錄。
請你「不要單純摘要」，而是找出它們之間可能存在的深層關聯，並重組成新的產品、故事、品牌、課程或功能點子。

請「只」回傳一個 JSON 物件（不要任何解釋、不要 markdown fence），格式：
{
  "ideas": [
    {
      "title": "點子名稱（有記憶點、不要平庸）",
      "summary": "2~3 句把這個點子講清楚",
      "ideaType": "從這幾種挑一個最貼切：${IDEA_TYPES.join(" / ")}",
      "sourceFragmentIds": ["用到的碎片 id，對應上面 [#id]"],
      "whyItWorks": "為什麼這些碎片可以組合在一起、為什麼這個點子成立",
      "nextSteps": ["2~4 個具體的下一步行動"]
    }
  ]
}

要求：
- 請產生 ${count} 個點子
- 每個點子都要真的「跨碎片」連結，不要只是複述單一碎片
- 全部用繁體中文`;

  try {
    const r = await callAI({
      provider: resolved.model.provider,
      model: resolved.model.model,
      apiKey: resolved.model.apiKey,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `碎片如下：\n\n${fragmentBlock}` },
      ],
      temperature: 0.85,
      maxTokens: 2500,
    });

    const parsed = extractJson<{ ideas?: any[] }>(r.text);
    if (!parsed || !Array.isArray(parsed.ideas) || parsed.ideas.length === 0) {
      return NextResponse.json({ error: "ai_bad_json", raw: r.text }, { status: 502 });
    }

    const validIds = new Set(fragments.map((f) => f.id));
    const rows = parsed.ideas.slice(0, 5).map((it: any) => ({
      created_by: user.id,
      title: String(it.title ?? "未命名點子").slice(0, 200),
      summary: String(it.summary ?? "").slice(0, 2000),
      idea_type: IDEA_TYPES.includes(it.ideaType) ? it.ideaType : null,
      source_fragment_ids: Array.isArray(it.sourceFragmentIds)
        ? it.sourceFragmentIds.map(String).filter((x: string) => validIds.has(x)).slice(0, 40)
        : [],
      why_it_works: it.whyItWorks ? String(it.whyItWorks).slice(0, 2000) : null,
      next_steps: Array.isArray(it.nextSteps)
        ? it.nextSteps.map((x: any) => String(x).trim()).filter(Boolean).slice(0, 10)
        : [],
      saved: false,
    }));

    const { data: inserted, error } = await admin.from("generated_ideas").insert(rows).select("*");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ideas: inserted ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: "ai_call_failed", message: e?.message }, { status: 500 });
  }
}
