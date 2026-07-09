"use client";
/**
 * 瀏覽器端 LLM（WebLLM / WebGPU）——「真無限免費」層。
 *
 * 模型跑在**使用者的瀏覽器**（WebGPU），伺服器 $0、不吃任何 API 額度、可無限擴充。
 * 適合：簡單問答的免費層 fallback。限制：需較好裝置、首次要下載模型(~1GB)、品質低於雲端、無 RAG。
 *
 * 全部動態 import，避免打包進 server bundle；所有函式都 fail-soft。
 */

// 預設小模型：Qwen2.5-1.5B（多語、含中文佳、~1.2GB）。可換 Llama-3.2-1B（更小、中文較弱）。
export const DEFAULT_LOCAL_MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

export type LocalRole = "system" | "user" | "assistant";
export type LocalMessage = { role: LocalRole; content: string };
export type InitProgress = { progress: number; text: string };

/** 這台裝置/瀏覽器支不支援 WebGPU（不支援就別顯示本地模型選項）。 */
export function isWebGPUAvailable(): boolean {
  try {
    return typeof navigator !== "undefined" && !!(navigator as any).gpu;
  } catch {
    return false;
  }
}

// 引擎單例（同一分頁只載一次模型）
let enginePromise: Promise<any> | null = null;
let currentModel = "";

/**
 * 載入 / 取得本地引擎（同模型只載一次）。onProgress 回報下載/初始化進度（0~1）。
 * 失敗回 null（呼叫端 fallback 回雲端）。
 */
export async function getLocalEngine(
  model: string = DEFAULT_LOCAL_MODEL,
  onProgress?: (p: InitProgress) => void,
): Promise<any | null> {
  if (!isWebGPUAvailable()) return null;
  try {
    if (enginePromise && currentModel === model) return await enginePromise;
    currentModel = model;
    enginePromise = (async () => {
      const webllm: any = await import("@mlc-ai/web-llm");
      return await webllm.CreateMLCEngine(model, {
        initProgressCallback: (r: any) =>
          onProgress?.({ progress: Number(r?.progress ?? 0), text: String(r?.text ?? "") }),
      });
    })();
    return await enginePromise;
  } catch (e) {
    console.warn("[webllm] engine init failed:", e);
    enginePromise = null;
    return null;
  }
}

/**
 * 用本地模型串流回答。onToken 每收到一段文字就呼叫。回傳完整文字（失敗回 null → 呼叫端 fallback）。
 */
export async function streamLocalReply(
  messages: LocalMessage[],
  onToken: (delta: string) => void,
  opts?: { model?: string; temperature?: number; onProgress?: (p: InitProgress) => void; signal?: AbortSignal },
): Promise<string | null> {
  const engine = await getLocalEngine(opts?.model ?? DEFAULT_LOCAL_MODEL, opts?.onProgress);
  if (!engine) return null;
  try {
    const chunks = await engine.chat.completions.create({
      messages,
      stream: true,
      temperature: opts?.temperature ?? 0.7,
    });
    let full = "";
    for await (const chunk of chunks) {
      if (opts?.signal?.aborted) break;
      const delta = chunk?.choices?.[0]?.delta?.content ?? "";
      if (delta) {
        full += delta;
        onToken(delta);
      }
    }
    return full;
  } catch (e) {
    console.warn("[webllm] stream failed:", e);
    return null;
  }
}

/** 釋放模型記憶體（切換模型 / 關面板時可呼叫）。 */
export async function unloadLocalEngine(): Promise<void> {
  try {
    const engine = enginePromise ? await enginePromise : null;
    await engine?.unload?.();
  } catch { /* ignore */ }
  enginePromise = null;
  currentModel = "";
}
