import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { resolveModel } from "@/lib/creator-engine/ai/router";
import { callAI } from "@/lib/ai-providers";
import { logAiUsage } from "@/lib/ai-usage-log";
import { estimateCostUsd } from "@/lib/creator-engine/ai/cost";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `你是「綠寶」，創作者島嶼的 AI 創作夥伴。個性親切像朋友、有溫度、會給「具體、可立刻動手」的建議。
你的任務：陪使用者發想、把零散碎片變成作品、給創作方向（音樂/小說/故事/詩/文案…）、看圖給靈感。
回答用繁體中文、簡潔有重點；需要時用條列。不要空泛雞湯。`;

/** POST { messages:[{role,content}], image?:{data(base64),mediaType}, workspaceId? } → { reply } */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  const history = Array.isArray(b.messages) ? b.messages.slice(-12) : [];
  if (!history.length) return NextResponse.json({ error: "validation" }, { status: 422 });

  const resolved = await resolveModel("chat");
  if (!resolved.ok) return NextResponse.json({ error: resolved.error, message: resolved.message }, { status: resolved.status });
  const { provider, model, apiKey } = resolved.model;

  // 組訊息；最後一則 user 若帶圖 → 多模態 content
  const msgs: any[] = [{ role: "system", content: SYSTEM }];
  history.forEach((m: any, i: number) => {
    const isLast = i === history.length - 1;
    if (isLast && m.role === "user" && b.image?.data) {
      msgs.push({ role: "user", content: [{ type: "text", text: String(m.content ?? "") }, { type: "image", mediaType: b.image.mediaType || "image/jpeg", data: b.image.data }] });
    } else {
      msgs.push({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content ?? "") });
    }
  });

  try {
    const res = await callAI({ provider, model, apiKey, messages: msgs, maxTokens: 1500, temperature: 0.8 });
    await logAiUsage(provider, model, res.tokensInput, res.tokensOutput).catch(() => {});
    // 寫進 ci_agent_runs → 後台「AI 對話」看得到
    const admin = createSupabaseAdmin();
    const cost = await estimateCostUsd(provider, model, res.tokensInput, res.tokensOutput).catch(() => 0);
    await admin.from("ci_agent_runs").insert({
      workspace_id: b.workspaceId ?? null, user_id: u.userId, agent_type: "chat",
      input: { last: String(history[history.length - 1]?.content ?? "").slice(0, 500), hasImage: !!b.image }, output: { reply: res.text?.slice(0, 1000) },
      provider, model, tokens_input: res.tokensInput, tokens_output: res.tokensOutput, cost_usd: cost, status: "succeeded",
    }).then(() => {}, () => {});
    return NextResponse.json({ reply: res.text });
  } catch (e) {
    return NextResponse.json({ error: "ai", message: (e as Error).message }, { status: 500 });
  }
}
