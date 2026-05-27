/**
 * 給 Discord / Telegram admin bot 共用：
 * 找一個 anthropic active model + 已啟用 key、用來跑 askAIWithTools（tool use 只支援 Anthropic）。
 *
 * 設計：
 *  - 即使使用者當前選的是 OpenAI / Gemini / Groq、admin tool 也用 anthropic 跑（林董授權）
 *  - 找不到 anthropic key / model → 回 null、caller 退回原本 callAI
 *  - 系統 prompt 由 caller 提供、會自動 append 工具提示句
 */
import { createSupabaseAdmin } from "./supabase-admin";
import { decryptKey } from "./ai-crypto";
import { askAIWithTools } from "./line-ai-tools";
import type { AdminLineUser } from "./admin-line-users";

export const TOOL_PROMPT_HINT =
  `\n\n## 工具使用\n` +
  `你有 admin tools 可用（run_command / get_user_detail / get_error_detail / get_recent_errors / get_order_detail / get_student_learning_state / get_chapter_stats / get_period_report）。\n` +
  `**遇到「報表 / 統計 / 用戶 / 章節學習狀況 / 週報月報 / 錯誤詳情」這類問題、主動呼叫對應 tool 拿真實資料、不要憑空回答。**\n` +
  `拿到 tool 結果後、用自然語言把重點 200-300 字講完、不要原樣貼 raw 資料。`;

export interface AnthropicToolResult {
  /** AI 回的文字（含錯誤訊息）*/
  text: string;
  /** 實際用的 anthropic model_name（給 footer 顯示） */
  modelUsed: string;
  /** true = 用 askAIWithTools 跑成功（有 tool 能力）；false = 找不到 anthropic、caller 該退回原本 callAI */
  ok: boolean;
}

/**
 * 嘗試用 askAIWithTools 跑一輪、找不到 anthropic key/model 回 ok=false。
 * caller 看到 ok=false 該 fallback 到原本的 callAI（無 tool）。
 */
export async function tryAnthropicToolRun(opts: {
  systemPrompt: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  user: AdminLineUser;
  /** 偏好 model_name（如果該 model 是 anthropic、優先用）*/
  preferModel?: string;
}): Promise<AnthropicToolResult | null> {
  const admin = createSupabaseAdmin();

  // 1. 找 anthropic active model
  const { data: models } = await admin
    .from("ai_models")
    .select("model_name, provider")
    .eq("provider", "anthropic")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const list = (models as any[]) ?? [];
  if (list.length === 0) return null;

  const chosen =
    (opts.preferModel && list.find((m) => m.model_name === opts.preferModel)) ||
    list[0];

  // 2. 找 anthropic key
  const { data: keyRow } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled")
    .eq("provider", "anthropic")
    .maybeSingle();
  if (!keyRow || !(keyRow as any).enabled) return null;

  let apiKey: string;
  try {
    apiKey = decryptKey((keyRow as any).api_key_encrypted);
  } catch {
    return null;
  }

  // 3. 跑 tool loop
  const text = await askAIWithTools({
    apiKey,
    model: chosen.model_name,
    systemPrompt: opts.systemPrompt + TOOL_PROMPT_HINT,
    history: opts.history,
    user: opts.user,
  });

  return {
    text,
    modelUsed: `anthropic/${chosen.model_name}`,
    ok: true,
  };
}
