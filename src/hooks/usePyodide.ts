"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

declare global {
  interface Window {
    loadPyodide?: any;
    __pyodide?: any;
    __pyodideLoadingPromise?: Promise<any>;
  }
}

export type PyodideStatus = "idle" | "loading" | "ready" | "error";

/**
 * 共用 Pyodide 載入 hook
 * 第一次 ~5MB、之後 browser cache
 *
 * 用法：
 *   const { pyodide, status, run } = usePyodide();
 *   const result = await run("print('hi')");
 */
export function usePyodide(autoLoad = false) {
  const [status, setStatus] = useState<PyodideStatus>(
    typeof window !== "undefined" && window.__pyodide ? "ready" : "idle",
  );
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const pyodideRef = useRef<any>(typeof window !== "undefined" ? window.__pyodide : null);

  const load = useCallback(async () => {
    if (typeof window === "undefined") return null;
    if (window.__pyodide) {
      pyodideRef.current = window.__pyodide;
      setStatus("ready");
      return window.__pyodide;
    }
    if (window.__pyodideLoadingPromise) {
      // 別處正在載、等同一份
      try {
        const p = await window.__pyodideLoadingPromise;
        pyodideRef.current = p;
        setStatus("ready");
        return p;
      } catch (e: any) {
        setStatus("error");
        setError(e?.message ?? "Pyodide 載入失敗");
        return null;
      }
    }

    setStatus("loading");
    setProgress("注入 pyodide.js...");
    setError(null);

    const promise = (async () => {
      // load <script>
      if (!window.loadPyodide) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = `${PYODIDE_CDN}pyodide.js`;
          s.async = true;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Pyodide script 載入失敗"));
          document.head.appendChild(s);
        });
      }
      setProgress("啟動 Python runtime (~5MB)...");
      const py = await window.loadPyodide({
        indexURL: PYODIDE_CDN,
        stdout: (s: string) => {
          // 預設 stdout、各 component 會 override
          console.log("[pyodide stdout]", s);
        },
      });
      setProgress("Python ok、預載 micropip...");
      await py.loadPackage("micropip");
      window.__pyodide = py;
      pyodideRef.current = py;
      setProgress("");
      return py;
    })();

    window.__pyodideLoadingPromise = promise;

    try {
      const p = await promise;
      setStatus("ready");
      return p;
    } catch (e: any) {
      setStatus("error");
      setError(e?.message ?? "Pyodide 載入失敗");
      return null;
    }
  }, []);

  useEffect(() => {
    if (autoLoad && status === "idle") {
      load();
    }
  }, [autoLoad, status, load]);

  /**
   * run python code、回 { stdout, stderr, result }
   */
  const run = useCallback(
    async (code: string, onStdout?: (chunk: string) => void): Promise<{ stdout: string; stderr: string; result: any; ok: boolean }> => {
      let py = pyodideRef.current ?? window.__pyodide;
      if (!py) {
        py = await load();
        if (!py) return { stdout: "", stderr: error ?? "Pyodide 沒載入成功", result: null, ok: false };
      }
      let stdout = "";
      let stderr = "";
      // 設定 stdout / stderr 捕獲
      py.setStdout({
        batched: (s: string) => {
          stdout += s + "\n";
          onStdout?.(s);
        },
      });
      py.setStderr({
        batched: (s: string) => {
          stderr += s + "\n";
        },
      });
      try {
        // 用 runPythonAsync 才能跑 await
        const result = await py.runPythonAsync(code);
        let resultStr: any = null;
        if (result !== undefined && result !== null) {
          try {
            resultStr = result.toString();
          } catch {
            resultStr = String(result);
          }
        }
        return { stdout, stderr, result: resultStr, ok: !stderr };
      } catch (e: any) {
        return { stdout, stderr: stderr + String(e?.message ?? e), result: null, ok: false };
      }
    },
    [load, error],
  );

  return { status, progress, error, load, run };
}
