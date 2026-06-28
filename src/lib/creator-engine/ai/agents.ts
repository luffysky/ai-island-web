/**
 * Creator Engine — Agents（M2）：凝聚 / 演化 / 編織（+ E11 song mode）。
 * 流程：resolveModel → callAI → extractJson → zod 驗證（修復/重試一次）→ 寫 ci_agent_runs + logAiUsage。
 * 核心動作免費（Cost Manager z_charged=0、E10）。
 */
import { z } from "zod";
import { callAI } from "@/lib/ai-providers";
import { extractJson } from "@/lib/idea-ai";
import { logAiUsage } from "@/lib/ai-usage-log";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveModel } from "@/lib/creator-engine/ai/router";
import { estimateCostUsd, resolveZCharge } from "@/lib/creator-engine/ai/cost";
import { getInjectableMemory, recordMemoryUsage } from "@/lib/creator-engine/memory";

export type AgentType = "synthesize" | "evolve" | "compose";

class AgentError extends Error {
  status: number;
  constructor(message: string, status = 502) { super(message); this.status = status; }
}

/** 共用：跑一個 agent、驗證輸出、記 run + usage。回 { result, agentRunId, run }. */
async function runAgent<T>(opts: {
  agentType: AgentType;
  workspaceId: string;
  userId: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  input: unknown;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ result: T; agentRunId: number }> {
  const resolved = await resolveModel();
  if (!resolved.ok) throw new AgentError(resolved.message, resolved.status);
  const { provider, model, apiKey } = resolved.model;

  const admin = createSupabaseAdmin();
  // 注入相關記憶（M4，current intent 仍以 user 訊息為主、記憶只是背景）
  const mem = await getInjectableMemory(opts.workspaceId, opts.userId).catch(() => ({ text: "", ids: [] as string[] }));
  const systemWithMem = mem.text ? `${opts.system}\n\n${mem.text}\n（以上為背景偏好；若與當前指令衝突，以當前指令為準。）` : opts.system;

  // 開一筆 running run
  const { data: runRow } = await admin.from("ci_agent_runs").insert({
    workspace_id: opts.workspaceId, user_id: opts.userId, agent_type: opts.agentType,
    input: opts.input as any, provider, model, status: "running",
  }).select("id").single();
  const agentRunId = (runRow as any)?.id as number;
  if (mem.ids.length) await recordMemoryUsage(mem.ids, agentRunId).catch(() => {});

  let tin = 0, tout = 0;
  try {
    let parsed: T | null = null;
    let lastText = "";
    for (let attempt = 0; attempt < 2 && parsed === null; attempt++) {
      const sys = attempt === 0 ? systemWithMem
        : systemWithMem + "\n\n（上次輸出無法解析，請『只』回傳合法 JSON、不要任何多餘文字。）";
      const r = await callAI({
        provider, model, apiKey,
        messages: [{ role: "system", content: sys }, { role: "user", content: opts.user }],
        temperature: opts.temperature ?? 0.8,
        maxTokens: opts.maxTokens ?? 2000,
      });
      tin += r.tokensInput || 0; tout += r.tokensOutput || 0;
      lastText = r.text;
      const json = extractJson<unknown>(r.text);
      const safe = json ? opts.schema.safeParse(json) : null;
      if (safe?.success) parsed = safe.data;
    }

    const cost = await estimateCostUsd(provider, model, tin, tout);
    await logAiUsage(provider, model, tin, tout); // usage parity（既有後台）

    if (parsed === null) {
      await admin.from("ci_agent_runs").update({
        status: "failed", tokens_input: tin, tokens_output: tout, cost_usd: cost,
        error: "output_validation_failed", output: { raw: lastText.slice(0, 2000) },
      }).eq("id", agentRunId);
      throw new AgentError("AI 回傳格式無法解析，請重試", 502);
    }

    const zCharge = await resolveZCharge(opts.workspaceId, opts.agentType);
    await admin.from("ci_agent_runs").update({
      status: "succeeded", tokens_input: tin, tokens_output: tout, cost_usd: cost,
      z_charged: zCharge, output: parsed as any,
    }).eq("id", agentRunId);

    return { result: parsed, agentRunId };
  } catch (e) {
    if (e instanceof AgentError) throw e;
    await admin.from("ci_agent_runs").update({ status: "failed", error: (e as Error).message?.slice(0, 500) }).eq("id", agentRunId).then(() => {}, () => {});
    throw new AgentError((e as Error).message ?? "agent_failed", 502);
  }
}

function fragmentBlock(frags: { id: string; title: string; content: string }[]): string {
  return frags.map((f) => `[#${f.id}] ${f.title}\n${(f.content || "").slice(0, 800)}`).join("\n\n");
}

// ===== 凝聚 Synthesize =====
const SynthesizeSchema = z.object({
  title: z.string(), summary: z.string(), coreIdea: z.string(),
  connections: z.array(z.string()).default([]),
});
export async function synthesize(workspaceId: string, userId: string, frags: { id: string; title: string; content: string }[]) {
  const system = `你是「靈感凝聚器」。把多個碎片濃縮成一個核心點子，並指出碎片之間「非顯而易見」的連結。
只回傳 JSON：{"title":"點子名","summary":"2~3句","coreIdea":"一句核心","connections":["碎片A的X和碎片B的Y之間的線，具體"]}。全部繁體中文。`;
  return runAgent({
    agentType: "synthesize", workspaceId, userId, schema: SynthesizeSchema,
    input: { fragmentIds: frags.map((f) => f.id) },
    system, user: `碎片：\n\n${fragmentBlock(frags)}`,
  });
}

// ===== 演化 Evolve =====
const EvolveSchema = z.object({ variants: z.array(z.object({ title: z.string(), content: z.string() })).min(1) });
export async function evolve(workspaceId: string, userId: string, seed: { id: string; title: string; content: string }, count: number, direction?: string) {
  const n = Math.max(1, Math.min(20, count || 5));
  const system = `你是「創意演化器」。把一個種子碎片延伸出 ${n} 個不同方向的新碎片（角度要有差異、不要近似重複）。
只回傳 JSON：{"variants":[{"title":"...","content":"..."}]}（最多 ${n} 個）。全部繁體中文。`;
  return runAgent({
    agentType: "evolve", workspaceId, userId, schema: EvolveSchema,
    input: { fragmentId: seed.id, count: n, direction },
    system, user: `種子碎片：「${seed.title}」\n${seed.content}\n${direction ? `方向：${direction}` : ""}`,
    temperature: 0.95, maxTokens: 2500,
  });
}

// ===== 編織 Compose（+ E11 song mode）=====
const ComposeBase = z.object({ title: z.string(), body: z.string(), usedFragmentIds: z.array(z.string()).default([]) });
const ComposeSong = z.object({
  title: z.string(),
  lyricsSectioned: z.string(),   // 含 Verse/Pre-Chorus/Chorus/Bridge/Outro 標記
  sunoPrompt: z.string(),
  mvPrompt: z.string(),
  usedFragmentIds: z.array(z.string()).default([]),
});
export async function compose(workspaceId: string, userId: string, workType: string, frags: { id: string; title: string; content: string }[]) {
  const isSong = workType === "song";
  if (isSong) {
    const system = `你是「編織者」。把碎片編成一首歌，並產出可直接用的音樂提示詞。
只回傳 JSON：{"title":"歌名","lyricsSectioned":"含【Verse】【Pre-Chorus】【Chorus】【Bridge】【Outro】標記的完整歌詞","sunoPrompt":"Suno 風格英文提示","mvPrompt":"MV 視覺英文提示","usedFragmentIds":["用到的碎片id"]}。歌詞繁中、prompt 可英文。`;
    return runAgent({
      agentType: "compose", workspaceId, userId, schema: ComposeSong,
      input: { workType, fragmentIds: frags.map((f) => f.id) },
      system, user: `碎片：\n\n${fragmentBlock(frags)}`, maxTokens: 3000,
    });
  }
  const system = `你是「編織者」。把碎片編織成一篇 ${workType} 作品草稿，保留作者語氣。
只回傳 JSON：{"title":"標題","body":"內容(markdown)","usedFragmentIds":["用到的碎片id"]}。全部繁體中文。`;
  return runAgent({
    agentType: "compose", workspaceId, userId, schema: ComposeBase,
    input: { workType, fragmentIds: frags.map((f) => f.id) },
    system, user: `碎片：\n\n${fragmentBlock(frags)}`, maxTokens: 3000,
  });
}

export { AgentError };
