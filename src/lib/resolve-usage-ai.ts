// 用途(usage_key) → { model, provider, apiKey } 統一解析 + 失敗自動退備援模型。
//
// 為什麼存在：
//  1) 以前各檔各自 `getProviderKey("anthropic")` + 寫死打 api.anthropic.com、但用途的 model
//     是 admin 後台可改的（ai_usage_models）。改成非 anthropic（如 gpt-4o）→ 那些檔還是丟去
//     Anthropic → 404。收斂成這支、呼叫端統一走 callAI，admin 改 model 也不會接錯家。
//  2) 智慧備援：主模型額度用完 / 429 / 服務掛掉 → 自動換另一家 active 模型重試（如 OpenRouter
//     免費額度用完自動退回 Claude Haiku），不用人去後台手動調。
import { callAI, type AIMessage } from "./ai-providers";
import { getModelNameForUsage, getCandidatesForUsage, type AiUsageKey, type UsageCandidate } from "./ai-usage-models";
import { getProviderKey } from "./ai-crypto";

export type Provider = "anthropic" | "openai" | "google" | "groq" | "openrouter" | "cloudflare";

/** 從 model 名稱推 provider。新增 provider/命名規則時改這裡（唯一真相）。 */
export function providerFromModel(model: string): Provider {
  const m = (model || "").toLowerCase();
  if (m.startsWith("@cf/")) return "cloudflare"; // Cloudflare Workers AI，如 @cf/meta/llama-3.1-8b-instruct
  if (m.startsWith("claude")) return "anthropic";
  if (m.startsWith("gemini")) return "google";
  // groq 上的開源模型（含帶斜線的 openai/gpt-oss、qwen/…）要先判、別被下面的「/→openrouter」搶走
  if (m.includes("gpt-oss") || m.includes("llama") || m.includes("qwen") || m.includes("mixtral")) return "groq";
  if (m.includes("/")) return "openrouter"; // e.g. deepseek/deepseek-r1:free
  if (m.startsWith("gpt") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4") || m.startsWith("text-embedding")) return "openai";
  return "anthropic"; // 安全預設
}

/** 明確 provider 前綴（如 "groq:llama-3.1-8b" / "openrouter:deepseek/..."）覆寫自動推斷。 */
function splitProviderPrefix(model: string): { provider?: Provider; model: string } {
  const known = ["anthropic", "openai", "google", "groq", "openrouter", "cloudflare"];
  const idx = model.indexOf(":");
  if (idx > 0) {
    const p = model.slice(0, idx).toLowerCase();
    if (known.includes(p)) return { provider: p as Provider, model: model.slice(idx + 1) };
  }
  return { model };
}

/** 把「候選 model 名稱」解成可打的 {provider, model, apiKey}；缺 key → null（呼叫端跳下一個）。 */
export async function resolveByModelName(modelName: string): Promise<Resolved | null> {
  const { provider: forced, model } = splitProviderPrefix(modelName);
  const provider = forced ?? providerFromModel(model);
  const apiKey = await getProviderKey(provider);
  if (!apiKey) return null;
  return { model, provider, apiKey };
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

// 額度用完 / 限流 / 暫時性錯誤 / 模型被下架(404) → 值得換模型重試（壞 prompt 之類的真錯不退、直接丟出）。
// 404 / not found / no longer available：模型被 provider 下架（如 Google 停 gemini-2.5-flash）→ 換一家、別整個死。
function isQuotaOrTransient(e: any): boolean {
  const s = String(e?.message ?? e ?? "").toLowerCase();
  return /\b(402|403|404|429|500|502|503|529)\b/.test(s)
    || /(quota|rate.?limit|overloaded|insufficient|exceeded|payment|credit|too many requests|capacity|unavailable|timeout|aborted|not.?found|no longer available|does not exist|deprecated|decommission)/.test(s);
}

/** 額度滿/限流/掛掉的錯誤訊息 → 值得換模型重試。對外給聊天串流路由判斷用。 */
export function isQuotaOrTransientError(e: any): boolean {
  return isQuotaOrTransient(e);
}

// ───────────────────────── 健康度：極簡 in-memory circuit breaker ─────────────────────────
// 某 provider 剛硬失敗（429/5xx/timeout）→ 短暫「跳閘」、路由暫時略過它、優先打別家。
// 純記憶體（per server instance）、無 DB 依賴、best-effort。重啟即清空。
const CB_COOLDOWN_MS = 60_000;        // 跳閘冷卻
const CB_TRIP_THRESHOLD = 2;          // 連續失敗幾次才跳閘
const breaker = new Map<string, { fails: number; until: number }>();

function markProviderFailure(provider: string) {
  const cur = breaker.get(provider) ?? { fails: 0, until: 0 };
  cur.fails += 1;
  if (cur.fails >= CB_TRIP_THRESHOLD) cur.until = Date.now() + CB_COOLDOWN_MS;
  breaker.set(provider, cur);
}
function markProviderSuccess(provider: string) {
  breaker.delete(provider);
}
/** provider 目前是否跳閘（冷卻中）。對外可給監控/路由排序。 */
export function isProviderTripped(provider: string): boolean {
  const cur = breaker.get(provider);
  if (!cur) return false;
  if (cur.until && Date.now() < cur.until) return true;
  if (cur.until && Date.now() >= cur.until) { breaker.delete(provider); } // 冷卻到期、清掉
  return false;
}

// ───────────────────────── 低信心偵測（→ 升級重試） ─────────────────────────
const REFUSAL_PATTERNS = [
  /抱歉[，,\s]*我(?:無法|不能|沒有辦法)/,
  /我(?:無法|不能|沒辦法)(?:回答|協助|幫助|提供)/,
  /as an ai\b/i,
  /i(?:'m| am) (?:sorry|unable)\b/i,
  /i can(?:'t|not)\b/i,
  /無法回答|無可奉告|超出.*範圍/,
];

/** 便宜模型輸出「空/太短/像拒答」→ 值得用更強的候選再試一次。 */
export function looksLowConfidence(text: string, minChars = 12): boolean {
  const t = (text ?? "").trim();
  if (!t) return true;
  if (t.replace(/\s+/g, "").length < minChars) return true;
  return REFUSAL_PATTERNS.some((re) => re.test(t));
}

/** 智慧備援：撈 active 模型、排除剛失敗的 provider、優先 is_default、再來最便宜、且該 provider 有 key。對外給聊天串流 fallback 用。 */
export async function pickFallbackModel(excludeProvider?: Provider): Promise<Resolved | null> {
  return resolveFallback(excludeProvider);
}

/** 智慧備援（排除「一組」已試過的 provider）：全站自動 fallback 用（callAI / 串流路由多次退到底）。 */
export async function pickFallbackModelExcluding(exclude: Iterable<string>): Promise<Resolved | null> {
  const ex = new Set(Array.from(exclude, (s) => String(s).toLowerCase()));
  const { createSupabaseAdmin } = await import("./supabase-admin");
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("ai_models")
    .select("model_name, provider, is_default, cost_output_per_1m")
    .eq("is_active", true);
  const cands = ((data as any[]) ?? [])
    .filter((m) => !ex.has(String(m.provider).toLowerCase()))
    // 跳閘中的 provider 排到最後（仍保留為最後手段）；再來 is_default、最便宜
    .sort((a, b) =>
      (isProviderTripped(a.provider) ? 1 : 0) - (isProviderTripped(b.provider) ? 1 : 0) ||
      (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0) ||
      (a.cost_output_per_1m ?? 99) - (b.cost_output_per_1m ?? 99));
  for (const c of cands) {
    const apiKey = await getProviderKey(c.provider);
    if (apiKey) return { model: c.model_name, provider: c.provider, apiKey };
  }
  return null;
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

export type UsageCompletion = {
  text: string;
  model: string;
  provider: Provider;
  fellBack: boolean;
  escalated?: boolean;      // 低信心 → 升級到更強候選重試過
  attempts?: number;        // 總共打了幾個候選
};

/**
 * 智慧路由：給用途跑一次（非串流）completion。
 *
 * 流程（皆向後相容——沒設 candidates 就是「單一 model + 舊備援」的行為）：
 *  1. 取用途的「有序候選鏈」（ai_usage_models.candidates；沒設→單一 model）。
 *  2. 依序打：跳閘中的 provider 先降到隊尾；缺 key 的候選略過。
 *  3. 某候選 429/5xx/timeout → 記一次失敗（circuit breaker）→ 換下一個候選。
 *     真錯誤（壞 prompt 等）→ 直接拋，不亂退。
 *  4. 低信心升級：便宜候選回「空/太短/像拒答」→ 用更強候選（role:escalate 或鏈尾）再試一次；
 *     升級結果較佳才採用。
 *  5. 候選全滅 → 退回舊 resolveFallback（撈任何 active 模型）。
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

  const call = (r: Resolved) =>
    callAI({ provider: r.provider, model: r.model, apiKey: r.apiKey, messages, maxTokens: opts.maxTokens, temperature: opts.temperature, noFallback: true });

  const candidates = await getCandidatesForUsage(usageKey, defaultModel);

  // 跳閘中的 provider 排到隊尾（仍保留為最後手段、不整個丟掉）。
  const ordered = [...candidates].sort(
    (a, b) => (isProviderTripped(providerFromModel(a.model)) ? 1 : 0) - (isProviderTripped(providerFromModel(b.model)) ? 1 : 0),
  );

  // 升級目標：明確 role:escalate 優先、否則鏈尾（假設偏好度/強度最高）。
  const escalateTarget: UsageCandidate | undefined =
    candidates.find((c) => c.role === "escalate") ?? candidates[candidates.length - 1];

  let attempts = 0;
  let firstProvider: Provider | undefined;
  const triedModels = new Set<string>();

  for (const cand of ordered) {
    const resolved = await resolveByModelName(cand.model);
    if (!resolved) continue;                 // 缺 key → 跳過
    triedModels.add(cand.model);
    firstProvider ??= resolved.provider;
    attempts++;
    try {
      const r = await call(resolved);
      markProviderSuccess(resolved.provider);
      let text = r.text ?? "";
      let escalated = false;
      let usedModel = resolved.model;
      let usedProvider = resolved.provider;

      // 低信心升級：只在「這個候選不是升級目標」且有更強候選時做一次。
      if (
        cand.role !== "escalate" &&
        escalateTarget &&
        escalateTarget.model !== cand.model &&
        !triedModels.has(escalateTarget.model) &&
        looksLowConfidence(text)
      ) {
        const strong = await resolveByModelName(escalateTarget.model);
        if (strong) {
          triedModels.add(escalateTarget.model);
          attempts++;
          try {
            const r2 = await call(strong);
            markProviderSuccess(strong.provider);
            const t2 = r2.text ?? "";
            // 升級結果非低信心（或原本是空的）→ 採用升級版
            if (t2 && (!looksLowConfidence(t2) || !text)) {
              text = t2; usedModel = strong.model; usedProvider = strong.provider; escalated = true;
            }
          } catch (e2) {
            if (isQuotaOrTransient(e2)) markProviderFailure(strong.provider);
            // 升級失敗不致命：沿用原本（可能低信心但至少有東西）
          }
        }
      }

      return {
        text,
        model: usedModel,
        provider: usedProvider,
        fellBack: usedModel !== candidates[0]?.model,
        escalated,
        attempts,
      };
    } catch (e) {
      if (!isQuotaOrTransient(e)) throw e;    // 真錯誤不亂退
      markProviderFailure(resolved.provider);
      console.warn(`[ai] ${usageKey} 候選 ${cand.model} 失敗、換下一個：`, (e as any)?.message);
    }
  }

  // 候選全滅 → 舊 resolveFallback（撈任何 active 模型、排除最先失敗的 provider）
  const fb = await resolveFallback(firstProvider);
  if (!fb) throw new Error(`${usageKey}: 所有候選失敗且無可用備援`);
  attempts++;
  const r = await call(fb);
  markProviderSuccess(fb.provider);
  return { text: r.text ?? "", model: fb.model, provider: fb.provider, fellBack: true, attempts };
}
