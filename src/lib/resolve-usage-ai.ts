// 用途(usage_key) → { model, provider, apiKey } 統一解析 + 失敗自動退備援模型。
//
// 為什麼存在：
//  1) 以前各檔各自 `getProviderKey("anthropic")` + 寫死打 api.anthropic.com、但用途的 model
//     是 admin 後台可改的（ai_usage_models）。改成非 anthropic（如 gpt-4o）→ 那些檔還是丟去
//     Anthropic → 404。收斂成這支、呼叫端統一走 callAI，admin 改 model 也不會接錯家。
//  2) 智慧備援：主模型額度用完 / 429 / 服務掛掉 → 自動換另一家 active 模型重試（如 OpenRouter
//     免費額度用完自動退回 Claude Haiku），不用人去後台手動調。
import { callAI, type AIMessage } from "./ai-providers";
import { getModelNameForUsage, type AiUsageKey } from "./ai-usage-models";
import { getProviderKey } from "./ai-crypto";

export type Provider = "anthropic" | "openai" | "google" | "groq" | "openrouter";

/** 從 model 名稱推 provider。新增 provider/命名規則時改這裡（唯一真相）。 */
export function providerFromModel(model: string): Provider {
  const m = (model || "").toLowerCase();
  if (m.startsWith("claude")) return "anthropic";
  if (m.startsWith("gemini")) return "google";
  // groq 上的開源模型（含帶斜線的 openai/gpt-oss、qwen/…）要先判、別被下面的「/→openrouter」搶走
  if (m.includes("gpt-oss") || m.includes("llama") || m.includes("qwen") || m.includes("mixtral")) return "groq";
  if (m.includes("/")) return "openrouter"; // e.g. deepseek/deepseek-r1:free
  if (m.startsWith("gpt") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4") || m.startsWith("text-embedding")) return "openai";
  return "anthropic"; // 安全預設
}

type Resolved = { model: string; provider: Provider; apiKey: string };
export type ResolvedUsageAI = ({ ok: true } & Resolved) | { ok: false; error: string; provider: Provider };

/** 給用途 → 回該用途目前 model 對應的 {provider, key}。沒 key → ok:false。 */
export async function resolveUsageAI(usageKey: AiUsageKey, defaultModel: string): Promise<ResolvedUsageAI> {
  const model = await getModelNameForUsage(usageKey, defaultModel);
  const provider = providerFromModel(model);
  const apiKey = await getProviderKey(provider);
  if (!apiKey) return { ok: false, error: `${provider} key 未啟用（去 /admin/ai/models 設定）`, provider };
  return { ok: true, model, provider, apiKey };
}

// 額度用完 / 限流 / 暫時性錯誤 → 值得換模型重試（壞 prompt 之類的真錯不退、直接丟出）。
function isQuotaOrTransient(e: any): boolean {
  const s = String(e?.message ?? e ?? "").toLowerCase();
  return /\b(402|403|429|500|502|503|529)\b/.test(s)
    || /(quota|rate.?limit|overloaded|insufficient|exceeded|payment|credit|too many requests|capacity|unavailable|timeout|aborted)/.test(s);
}

/** 額度滿/限流/掛掉的錯誤訊息 → 值得換模型重試。對外給聊天串流路由判斷用。 */
export function isQuotaOrTransientError(e: any): boolean {
  return isQuotaOrTransient(e);
}

/** 智慧備援：撈 active 模型、排除剛失敗的 provider、優先 is_default、再來最便宜、且該 provider 有 key。對外給聊天串流 fallback 用。 */
export async function pickFallbackModel(excludeProvider?: Provider): Promise<Resolved | null> {
  return resolveFallback(excludeProvider);
}

// 智慧備援：撈 active 模型、排除剛失敗的 provider、優先 is_default、再來最便宜、且該 provider 有 key。
async function resolveFallback(excludeProvider?: Provider): Promise<Resolved | null> {
  const { createSupabaseAdmin } = await import("./supabase-admin");
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("ai_models")
    .select("model_name, provider, is_default, cost_output_per_1m")
    .eq("is_active", true);
  const cands = ((data as any[]) ?? [])
    .filter((m) => m.provider !== excludeProvider)
    .sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0) || (a.cost_output_per_1m ?? 99) - (b.cost_output_per_1m ?? 99));
  for (const c of cands) {
    const apiKey = await getProviderKey(c.provider);
    if (apiKey) return { model: c.model_name, provider: c.provider, apiKey };
  }
  return null;
}

export type UsageCompletion = { text: string; model: string; provider: Provider; fellBack: boolean };

/**
 * 給用途跑一次（非串流）completion，**主模型失敗自動退備援**。回 { text, model, provider, fellBack }。
 * 把散落各檔「getProviderKey('anthropic') + 寫死 anthropic fetch + 解 data.content」收斂成一行。
 */
export async function completeForUsage(
  usageKey: AiUsageKey,
  opts: { system?: string; user: string | AIMessage[]; maxTokens?: number; temperature?: number; defaultModel?: string },
): Promise<UsageCompletion> {
  const defaultModel = opts.defaultModel ?? "claude-haiku-4-5-20251001";
  const messages: AIMessage[] = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  if (typeof opts.user === "string") messages.push({ role: "user", content: opts.user });
  else messages.push(...opts.user);

  const primary = await resolveUsageAI(usageKey, defaultModel);
  let failedProvider: Provider | undefined;

  if (primary.ok) {
    try {
      const r = await callAI({ provider: primary.provider, model: primary.model, apiKey: primary.apiKey, messages, maxTokens: opts.maxTokens, temperature: opts.temperature });
      return { text: r.text ?? "", model: primary.model, provider: primary.provider, fellBack: false };
    } catch (e) {
      if (!isQuotaOrTransient(e)) throw e;   // 真錯誤（壞 prompt 等）不亂退、直接拋
      failedProvider = primary.provider;
      console.warn(`[ai] ${usageKey} 主模型 ${primary.model} 失敗、自動退備援：`, (e as any)?.message);
    }
  } else {
    failedProvider = primary.provider;
  }

  const fb = await resolveFallback(failedProvider);
  if (!fb) throw new Error(primary.ok ? `主模型失敗且無可用備援` : primary.error);
  const r = await callAI({ provider: fb.provider, model: fb.model, apiKey: fb.apiKey, messages, maxTokens: opts.maxTokens, temperature: opts.temperature });
  return { text: r.text ?? "", model: fb.model, provider: fb.provider, fellBack: true };
}
