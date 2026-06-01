import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptKey } from "@/lib/ai-crypto";

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
