import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptKey } from "@/lib/ai-crypto";
import { callAI } from "@/lib/ai-providers";

export const IDEA_TYPES = ["產品", "故事", "行銷", "功能", "品牌", "歌曲", "課程"];

export type FragmentLite = {
  id: string;
  title: string;
  content: string | null;
  tags: string[] | null;
  mood: string | null;
  category: string | null;
};

export type ResolvedModel = { provider: string; model: string; apiKey: string };
export type ResolveResult =
  | { ok: true; model: ResolvedModel }
  | { ok: false; status: number; error: string; message: string };

/**
 * 挑一個可用的 AI model（優先 Anthropic → OpenAI → 任一）並解出 API key。
 * 「給我一個點子」的分析 / 生成共用。
 */
export async function resolveIdeaModel(): Promise<ResolveResult> {
  const admin = createSupabaseAdmin();
  const { data: models } = await admin
    .from("ai_models")
    .select("id, provider, model_name, is_active")
    .eq("is_active", true);

  const all = (models as any[]) ?? [];
  const model =
    all.find((m) => m.provider === "anthropic") ??
    all.find((m) => m.provider === "openai") ??
    all[0];

  if (!model) {
    return { ok: false, status: 503, error: "no_model", message: "沒有啟用的 AI model，到 /admin/ai/models 啟用" };
  }

  const { data: sysKey } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled")
    .eq("provider", model.provider)
    .maybeSingle();

  if (!sysKey || !(sysKey as any).enabled) {
    return { ok: false, status: 503, error: "no_api_key", message: `${model.provider} 沒設 API key（到 /admin/ai/models）` };
  }

  let apiKey: string;
  try {
    apiKey = decryptKey((sysKey as any).api_key_encrypted);
  } catch {
    return { ok: false, status: 500, error: "decrypt_failed", message: "API key 解密失敗" };
  }

  return { ok: true, model: { provider: model.provider, model: model.model_name, apiKey } };
}

/**
 * 從碎片重組出 N 個點子（不寫 DB、回 row 物件陣列，由呼叫端決定怎麼存）。
 * 「給我一個點子」(手動) 與 「每日推薦」共用同一套 prompt / 解析。
 */
export async function generateIdeaRows(opts: {
  fragments: FragmentLite[];
  count: number;
  userId: string;
}): Promise<
  | { ok: true; rows: any[] }
  | { ok: false; status: number; error: string; message: string; raw?: string }
> {
  const count = Math.min(Math.max(opts.count, 1), 5);
  const resolved = await resolveIdeaModel();
  if (!resolved.ok) return resolved;

  const fragmentBlock = opts.fragments
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

  let text: string;
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
    text = r.text;
  } catch (e: any) {
    return { ok: false, status: 500, error: "ai_call_failed", message: e?.message ?? "AI 呼叫失敗" };
  }

  const parsed = extractJson<{ ideas?: any[] }>(text);
  if (!parsed || !Array.isArray(parsed.ideas) || parsed.ideas.length === 0) {
    return { ok: false, status: 502, error: "ai_bad_json", message: "AI 回傳格式無法解析", raw: text };
  }

  const validIds = new Set(opts.fragments.map((f) => f.id));
  const rows = parsed.ideas.slice(0, 5).map((it: any) => ({
    created_by: opts.userId,
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
  }));

  return { ok: true, rows };
}

/** 從 AI 回傳文字裡盡量抽出 JSON（容忍 ```json fence / 前後雜訊） */
export function extractJson<T = any>(text: string): T | null {
  if (!text) return null;
  // 先試 fenced code block
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  // 抓第一個 { 到最後一個 }
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
