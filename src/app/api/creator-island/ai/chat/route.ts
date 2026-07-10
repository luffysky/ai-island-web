import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { resolveModel } from "@/lib/creator-engine/ai/router";
import { streamAI } from "@/lib/ai-providers";
import { estimateCostUsd } from "@/lib/creator-engine/ai/cost";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { loadUserMemory, formatMemoryForPrompt } from "@/lib/user-ai-memory";
import { gateHighTierModel } from "@/lib/ai-tier-gate";
import { decryptKey } from "@/lib/ai-crypto";
import { CREATOR_DAILY_SOFT_CAP } from "@/lib/ai-quota-config";

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

  // 只把 run 記到「使用者真的是成員」的 workspace，否則不歸屬（防污染他人 workspace 的 AI 用量/成本）
  let workspaceId: string | null = b.workspaceId ?? null;
  if (workspaceId) {
    const gate = await requireWorkspaceRole(workspaceId, u.userId, "viewer");
    if (gate instanceof NextResponse) workspaceId = null;
  }

  // 每日軟上限（預設 0=關；濫用時把 CREATOR_DAILY_SOFT_CAP 設正整數即生效）。防禦：統計失敗放行、不擋聊天。
  if (CREATOR_DAILY_SOFT_CAP > 0) {
    try {
      const admin0 = createSupabaseAdmin();
      const since = new Date(); since.setHours(0, 0, 0, 0);
      const { count } = await admin0.from("ci_agent_runs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", u.userId).eq("agent_type", "chat").gte("created_at", since.toISOString());
      if ((count ?? 0) >= CREATOR_DAILY_SOFT_CAP) {
        return NextResponse.json({ error: "daily_cap", message: "今天跟綠寶聊很多囉，明天再來 ☕" }, { status: 429 });
      }
    } catch { /* 統計失敗 → 放行 */ }
  }

  const resolved = await resolveModel("chat");
  if (!resolved.ok) return NextResponse.json({ error: resolved.error, message: resolved.message }, { status: resolved.status });
  let { provider, model, apiKey } = resolved.model;

  // 高階模型分層授權：免費 / Plus 不給高階模型（堵住「免費用戶無限跑高階燒錢」的洞）。
  // 全程防禦：任何一步失敗都保持原模型、不影響聊天。
  try {
    const adminG = createSupabaseAdmin();
    const { data: row } = await adminG.from("ai_models")
      .select("id, provider, model_name, tier").eq("provider", provider).eq("model_name", model).maybeSingle();
    if (row && (row as any).tier === "high") {
      const gated = await gateHighTierModel(adminG, u.userId, row);
      if (gated && (gated.provider !== provider || gated.model_name !== model)) {
        const { data: k } = await adminG.from("ai_api_keys")
          .select("api_key_encrypted, enabled").eq("provider", gated.provider).maybeSingle();
        if (k && (k as any).enabled) {
          try {
            const key = decryptKey((k as any).api_key_encrypted);
            provider = gated.provider; model = gated.model_name; apiKey = key;
          } catch { /* 解密失敗 → 保持原模型 */ }
        }
      }
    }
  } catch { /* 分層檢查失敗 → 保持原模型 */ }

  // 聚焦碎片：使用者在島上選了碎片、綠寶要針對這些碎片回答
  const focus = Array.isArray(b.focusFragments) ? b.focusFragments.slice(0, 8) : [];
  const focusText = focus.length
    ? `\n\n【使用者目前選中、要你聚焦的 ${focus.length} 個碎片】——回答時請圍繞這些碎片、把它們納入你的建議：\n` +
      focus.map((f: any, i: number) => `(${i + 1}) ${String(f.title ?? "").slice(0, 80)}：${String(f.content ?? "").slice(0, 600)}`).join("\n")
    : "";

  // 注入使用者長期記憶 / 自訂指示（fire-and-forget safe：載入失敗就當作沒記憶）
  let memoryText = "";
  try {
    memoryText = formatMemoryForPrompt(await loadUserMemory(u.userId));
  } catch {
    memoryText = "";
  }

  // 組訊息；最後一則 user 若帶圖 → 多模態 content
  const msgs: any[] = [{ role: "system", content: SYSTEM + memoryText + focusText }];
  history.forEach((m: any, i: number) => {
    const isLast = i === history.length - 1;
    if (isLast && m.role === "user" && b.image?.data) {
      msgs.push({ role: "user", content: [{ type: "text", text: String(m.content ?? "") }, { type: "image", mediaType: b.image.mediaType || "image/jpeg", data: b.image.data }] });
    } else {
      msgs.push({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content ?? "") });
    }
  });

  // 串流回覆（SSE）；收尾補 logAiUsage（streamAI 不自動記）+ 寫 ci_agent_runs。
  const encoder = new TextEncoder();
  const admin = createSupabaseAdmin();
  const stream = new ReadableStream({
    async start(controller) {
      let full = "";
      let usage = { tin: 0, tout: 0, cw: 0, cr: 0 };
      try {
        for await (const chunk of streamAI({ provider, model, apiKey, messages: msgs, maxTokens: 1500, temperature: 0.8 })) {
          const ch = chunk as any;
          if (ch.type === "text" && ch.text) {
            full += ch.text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text: ch.text })}\n\n`));
          } else if (ch.type === "done") {
            usage = { tin: ch.tokensInput ?? 0, tout: ch.tokensOutput ?? 0, cw: ch.cacheWriteTokens ?? 0, cr: ch.cacheReadTokens ?? 0 };
          } else if (ch.type === "error") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: ch.error })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      } catch (e: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: e?.message || "ai" })}\n\n`));
      } finally {
        controller.close();
      }
      // 記帳（streamAI 不自動記，跟主聊天/寵物一致）
      if (usage.tin || usage.tout) {
        const { logAiUsage } = await import("@/lib/ai-usage-log");
        logAiUsage(provider, model, usage.tin, usage.tout, { write: usage.cw, read: usage.cr }).catch(() => {});
      }
      // 寫進 ci_agent_runs → 後台「AI 對話」看得到
      if (full) {
        const cost = await estimateCostUsd(provider, model, usage.tin, usage.tout).catch(() => 0);
        admin.from("ci_agent_runs").insert({
          workspace_id: workspaceId, user_id: u.userId, agent_type: "chat",
          input: { last: String(history[history.length - 1]?.content ?? "").slice(0, 500), hasImage: !!b.image }, output: { reply: full.slice(0, 1000) },
          provider, model, tokens_input: usage.tin, tokens_output: usage.tout, cost_usd: cost, status: "succeeded",
        }).then(() => {}, () => {});
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive" },
  });
}
