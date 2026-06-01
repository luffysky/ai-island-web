import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptKey } from "@/lib/ai-crypto";
import { callAI } from "@/lib/ai-providers";
import { embedText } from "@/lib/ai-embeddings";

/** 把碎片組成要做 embedding 的文字 */
export function fragmentEmbedInput(f: {
  title: string; content?: string | null; tags?: string[] | null; category?: string | null; mood?: string | null;
}): string {
  return [f.title, f.content, f.category, f.mood, (f.tags ?? []).join(" ")]
    .filter(Boolean).join("\n").slice(0, 4000);
}

/** 算碎片 embedding 並寫回 DB（best-effort，失敗不拋；無 OpenAI key 時靜默跳過） */
export async function embedFragmentRow(id: string, f: Parameters<typeof fragmentEmbedInput>[0]): Promise<boolean> {
  try {
    const vec = await embedText(fragmentEmbedInput(f));
    if (!vec) return false;
    const admin = createSupabaseAdmin();
    await admin.from("idea_fragments").update({ embedding: `[${vec.join(",")}]` as any }).eq("id", id);
    return true;
  } catch {
    return false;
  }
}

export type SurprisingPair = { a_id: string; a_title: string; b_id: string; b_title: string; similarity: number };

/** 用 RPC 找語意中間帶的意外配對 */
export async function fetchSurprisingPairs(opts?: { count?: number; folder?: string | null }): Promise<SurprisingPair[]> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.rpc("idea_surprising_pairs", {
    match_count: opts?.count ?? 8,
    folder: opts?.folder ?? null,
  });
  if (error) return [];
  return (data ?? []) as SurprisingPair[];
}

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
  surprisingPairs?: SurprisingPair[];
  likedStyle?: string; // 回饋迴路：使用者喜歡過的點子風格摘要
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

  const system = `你是一個「靈感重組引擎」。你的核心價值不是「生點子」，而是【看見別人看不到的連結】——
告訴使用者：為什麼這些散落的碎片「值得」被組合在一起。

以下是使用者長期收集的人生碎片、專案想法與靈感紀錄。
請找出它們之間「非顯而易見」的深層關聯，並重組成新的產品、故事、品牌、課程或功能點子。

請「只」回傳一個 JSON 物件（不要任何解釋、不要 markdown fence），格式：
{
  "ideas": [
    {
      "title": "點子名稱（有記憶點、不要平庸）",
      "summary": "2~3 句把這個點子講清楚",
      "ideaType": "從這幾種挑一個最貼切：${IDEA_TYPES.join(" / ")}",
      "sourceFragmentIds": ["用到的碎片 id，對應上面 [#id]"],
      "connections": [
        "具體指出『碎片A 的某元素』和『碎片B 的某元素』之間那條線——它們共享的情緒/主題/結構/對比/因果。每條一句、要具體、要讓人有「原來如此」的感覺"
      ],
      "whyItWorks": "為什麼這個組合『值得做』、它打中了什麼、為什麼成立",
      "nextSteps": ["2~4 個具體的下一步行動"]
    }
  ]
}

鐵則：
- 每個點子至少連結 2 個以上的碎片，connections 至少 1 條、講的是碎片「之間」的關係，不是單一碎片的摘要。
- connections 不准空泛（禁止「都跟創作有關」這種廢話）；要指名是哪兩個碎片、哪個元素、為什麼能接。
- 寧可少而精，不要硬湊不相干的碎片。
- 語氣像敏銳的創意顧問，不是筆記軟體。
- 請產生 ${count} 個點子，全部用繁體中文。`;

  // 語意「意外配對」提示：這些碎片向量距離落在中間帶（表面遠、深層可能有張力）
  const pairsHint = (opts.surprisingPairs ?? []).length
    ? `\n\n【系統演算法發現的「意外配對」】這幾組碎片語意上距離較遠、但可能藏著值得挖的張力，請『優先』嘗試把它們接起來，找出非顯而易見的連結：\n` +
      opts.surprisingPairs!.map((p) => `- 「${p.a_title}」× 「${p.b_title}」`).join("\n")
    : "";

  const styleHint = opts.likedStyle
    ? `\n\n【使用者偏好】過去他特別喜歡這類點子/連結風格，請往這個方向靠：${opts.likedStyle}`
    : "";

  let text: string;
  try {
    const r = await callAI({
      provider: resolved.model.provider,
      model: resolved.model.model,
      apiKey: resolved.model.apiKey,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `碎片如下：\n\n${fragmentBlock}${pairsHint}${styleHint}` },
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
    connections: Array.isArray(it.connections)
      ? it.connections.map((x: any) => String(x).trim()).filter(Boolean).slice(0, 10)
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
