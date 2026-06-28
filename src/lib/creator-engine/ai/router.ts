/**
 * Creator Engine — Model Router
 * 每個 agent 可在後台指定模型（app_settings.creator_island_agent_models）；
 * 沒設就用既有解析（resolveIdeaModel：Anthropic→OpenAI→任一）。支援 OpenRouter 等任何 ai_models 內的 provider。
 */
import { resolveIdeaModel, type ResolveResult } from "@/lib/idea-ai";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptKey } from "@/lib/ai-crypto";
import { getAppSetting } from "@/lib/app-settings";

export const AGENT_MODEL_SETTING_KEY = "creator_island_agent_models";

/** 解析後台為某 agent 指定的特定模型；任何一步失敗回 null（呼叫端 fallback）。 */
async function resolveModelByName(modelName: string): Promise<ResolveResult | null> {
  const admin = createSupabaseAdmin();
  const { data: m } = await admin
    .from("ai_models").select("provider, model_name, is_active").eq("model_name", modelName).maybeSingle();
  if (!m || !(m as any).is_active) return null;
  const provider = (m as any).provider as string;
  const { data: sysKey } = await admin
    .from("ai_api_keys").select("api_key_encrypted, enabled").eq("provider", provider).maybeSingle();
  if (!sysKey || !(sysKey as any).enabled) return null;
  try {
    return { ok: true, model: { provider, model: (m as any).model_name, apiKey: decryptKey((sysKey as any).api_key_encrypted) } };
  } catch { return null; }
}

/** agentType 有後台指定模型就用它、否則 fallback 既有解析。 */
export async function resolveModel(agentType?: string): Promise<ResolveResult> {
  if (agentType) {
    try {
      const map = await getAppSetting<Record<string, string>>(AGENT_MODEL_SETTING_KEY, {});
      const wanted = map?.[agentType];
      if (wanted) {
        const r = await resolveModelByName(wanted);
        if (r) return r;
      }
    } catch { /* ignore → fallback */ }
  }
  return resolveIdeaModel();
}
