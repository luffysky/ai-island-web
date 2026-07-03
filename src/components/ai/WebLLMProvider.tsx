"use client";
/**
 * WebLLMProvider — 選用的「瀏覽器端 / 裝置上」小模型（@mlc-ai/web-llm）
 *
 * 目的：把「極瑣碎」的任務（打招呼、超短分類、罐頭回覆潤飾…）丟到使用者裝置上跑，
 *      零 API 成本、零延遲往返、離線也能動。非瑣碎任務一律照舊走 server。
 *
 * 安全設計（重點）：
 *  - 預設「關」：由 feature flag `flag_webllm` 控制（呼叫端把 flag 值傳進 `enabled`）。
 *  - 沒 WebGPU / 載入失敗 / 未安裝 @mlc-ai/web-llm → 靜默降級：available=false、
 *    呼叫 generate() 回 null → 呼叫端 fallback 到 server。全程不丟例外、不影響現有功能。
 *  - `@mlc-ai/web-llm` 用「執行期動態 import + webpackIgnore」載入：
 *    套件沒裝時 **build 不會壞**、runtime 才嘗試、失敗就降級。
 *    要真正啟用：`npm i @mlc-ai/web-llm` 後把 flag 打開即可，無需改這支。
 *
 * 用法：
 *   <WebLLMProvider enabled={flagWebllm}>
 *     ...  // 內層元件用 useWebLLM()
 *   </WebLLMProvider>
 *
 *   const { available, ready, ensureLoaded, generate } = useWebLLM();
 *   if (available) { await ensureLoaded(); const out = await generate("你好"); }
 */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

// 預設小模型（~1GB 量級、行動裝置也還能跑）；可用 prop 覆寫。
const DEFAULT_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

type WebLLMStatus = "idle" | "loading" | "ready" | "unavailable" | "error";

export type WebLLMContextValue = {
  /** 環境理論上可用（flag 開 + 有 WebGPU + 非 SSR）。不代表模型已載入。 */
  available: boolean;
  /** 模型權重已下載並可推論。 */
  ready: boolean;
  status: WebLLMStatus;
  /** 下載進度 0~1（載入中才有意義）。 */
  progress: number;
  /** 觸發（惰性）載入模型；重複呼叫安全。回是否成功 ready。 */
  ensureLoaded: () => Promise<boolean>;
  /** 在裝置上生成；不可用/失敗回 null（呼叫端請 fallback server）。 */
  generate: (prompt: string, opts?: { system?: string; maxTokens?: number; temperature?: number }) => Promise<string | null>;
};

const noop: WebLLMContextValue = {
  available: false,
  ready: false,
  status: "unavailable",
  progress: 0,
  ensureLoaded: async () => false,
  generate: async () => null,
};

const WebLLMContext = createContext<WebLLMContextValue>(noop);

export function useWebLLM(): WebLLMContextValue {
  return useContext(WebLLMContext);
}

function hasWebGPU(): boolean {
  return typeof navigator !== "undefined" && !!(navigator as any).gpu;
}

export function WebLLMProvider({
  children,
  enabled = false,
  model = DEFAULT_MODEL,
}: {
  children: React.ReactNode;
  enabled?: boolean;      // ← 接 feature flag `flag_webllm`
  model?: string;
}) {
  const available = enabled && hasWebGPU();
  const [status, setStatus] = useState<WebLLMStatus>(available ? "idle" : "unavailable");
  const [progress, setProgress] = useState(0);
  const engineRef = useRef<any>(null);
  const loadingRef = useRef<Promise<boolean> | null>(null);

  const ensureLoaded = useCallback(async (): Promise<boolean> => {
    if (!available) return false;
    if (engineRef.current) return true;
    if (loadingRef.current) return loadingRef.current;

    loadingRef.current = (async () => {
      setStatus("loading");
      try {
        // 執行期動態載入；webpackIgnore → build 不需要套件存在。
        // @ts-expect-error — 選用套件、未安裝時 TS 會報找不到模組（runtime try/catch 已保護）
        const mod: any = await import(/* webpackIgnore: true */ "@mlc-ai/web-llm");
        const engine = await mod.CreateMLCEngine(model, {
          initProgressCallback: (p: any) => setProgress(typeof p?.progress === "number" ? p.progress : 0),
        });
        engineRef.current = engine;
        setStatus("ready");
        return true;
      } catch (e) {
        // 未安裝 / 下載失敗 / 不支援 → 靜默降級
        console.warn("[WebLLM] 載入失敗、降級走 server：", (e as any)?.message ?? e);
        setStatus("error");
        return false;
      } finally {
        loadingRef.current = null;
      }
    })();
    return loadingRef.current;
  }, [available, model]);

  const generate = useCallback<WebLLMContextValue["generate"]>(
    async (prompt, opts) => {
      const ok = await ensureLoaded();
      if (!ok || !engineRef.current) return null;
      try {
        const messages: any[] = [];
        if (opts?.system) messages.push({ role: "system", content: opts.system });
        messages.push({ role: "user", content: prompt });
        const res = await engineRef.current.chat.completions.create({
          messages,
          temperature: opts?.temperature ?? 0.7,
          max_tokens: opts?.maxTokens ?? 256,
        });
        return res?.choices?.[0]?.message?.content ?? null;
      } catch (e) {
        console.warn("[WebLLM] 生成失敗、降級走 server：", (e as any)?.message ?? e);
        return null;
      }
    },
    [ensureLoaded],
  );

  const value = useMemo<WebLLMContextValue>(
    () => ({ available, ready: status === "ready", status, progress, ensureLoaded, generate }),
    [available, status, progress, ensureLoaded, generate],
  );

  return <WebLLMContext.Provider value={value}>{children}</WebLLMContext.Provider>;
}

export default WebLLMProvider;
