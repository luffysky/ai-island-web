// 記一次 AI 用量/費用 — per-model 月聚合（ai_model_usage）+ 系統 key 月花費（ai_api_keys）。
// callAI 成功後 best-effort 呼叫這支 → 把以前沒記的 bot/排程/推薦用量都算進來、後台費用才準。
import { estimateCost } from "./ai-providers";

let ratesCache: { at: number; map: Map<string, { in: number; out: number }> } | null = null;
const RATES_TTL = 5 * 60_000;

async function getRates(): Promise<Map<string, { in: number; out: number }>> {
  if (ratesCache && Date.now() - ratesCache.at < RATES_TTL) return ratesCache.map;
  const { createSupabaseAdmin } = await import("./supabase-admin");
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ai_models").select("provider, model_name, cost_input_per_1m, cost_output_per_1m");
  const map = new Map<string, { in: number; out: number }>();
  for (const m of (data as any[]) ?? []) {
    map.set(`${m.provider}/${m.model_name}`, { in: Number(m.cost_input_per_1m) || 0, out: Number(m.cost_output_per_1m) || 0 });
  }
  ratesCache = { at: Date.now(), map };
  return map;
}

/**
 * best-effort：失敗不影響主流程。
 * cache：Anthropic prompt-cache tokens（write 1.25× / read 0.1× input 費率）。
 * 記的 tokens_input 含 cache（實際處理量），cost 用加權後的等效 input。
 */
export async function logAiUsage(
  provider: string, model: string, tokensIn: number, tokensOut: number,
  cache?: { write?: number; read?: number },
): Promise<void> {
  try {
    if (!provider || !model) return;
    const cw = cache?.write || 0, cr = cache?.read || 0;
    const totalIn = (tokensIn || 0) + cw + cr;          // 實際處理的 input tokens（含 cache）
    if (totalIn <= 0 && (tokensOut ?? 0) <= 0) return;
    const rates = await getRates();
    const r = rates.get(`${provider}/${model}`) ?? { in: 0, out: 0 };
    const billableIn = (tokensIn || 0) + cw * 1.25 + cr * 0.1; // 等效計費 input
    const cost = estimateCost(billableIn, tokensOut || 0, r.in, r.out);
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const { createSupabaseAdmin } = await import("./supabase-admin");
    const admin = createSupabaseAdmin();
    await admin.rpc("inc_model_usage", { p_month: month, p_provider: provider, p_model: model, p_tin: totalIn, p_tout: tokensOut || 0, p_cost: cost });
    await admin.rpc("inc_system_key_usage", { p_provider: provider, p_cost: cost });
  } catch { /* best-effort */ }
}
