/**
 * Creator Engine — Model Router（M2 最小版）
 * 包既有 callAI + resolveIdeaModel（Anthropic→OpenAI→任一）。未來按 task/quality/budget 路由。
 */
import { resolveIdeaModel, type ResolveResult } from "@/lib/idea-ai";

export async function resolveModel(): Promise<ResolveResult> {
  // M2：沿用既有解析（已是 Anthropic 優先 + 解密 key）。未來在此加 task/quality/fallback 策略。
  return resolveIdeaModel();
}
