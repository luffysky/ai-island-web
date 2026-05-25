"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const MAX_STDOUT_LINES = 2000;       // 超過自動截斷、避免瀏覽器卡
const MAX_STDOUT_CHARS = 200_000;    // 200KB 上限

declare global {
  interface Window {
    loadPyodide?: any;
    __pyodide?: any;
    __pyodideLoadingPromise?: Promise<any>;
    __pyodideRunMutex?: Promise<void>;  // 全域 mutex、避免不同 Tab 同時跑導致 stdout 串台
  }
}

export type PyodideStatus = "idle" | "loading" | "ready" | "error";

export type RunResult = {
  stdout: string;
  stderr: string;
  result: string | null;
  ok: boolean;
  truncated?: boolean;  // 是否被截斷
};

function truncateOutput(text: string): { text: string; truncated: boolean } {
  const lines = text.split("\n");
  let truncated = false;
  let out = text;
  if (lines.length > MAX_STDOUT_LINES) {
    out = lines.slice(0, MAX_STDOUT_LINES).join("\n") + `\n\n... (省略 ${lines.length - MAX_STDOUT_LINES} 行、限 ${MAX_STDOUT_LINES} 行避免瀏覽器卡)`;
    truncated = true;
  }
  if (out.length > MAX_STDOUT_CHARS) {
    out = out.substring(0, MAX_STDOUT_CHARS) + `\n\n... (省略 ${out.length - MAX_STDOUT_CHARS} 個字元)`;
    truncated = true;
  }
  return { text: out, truncated };
}

function simplifyTraceback(stderr: string): string {
  // 把 Pyodide 的內部 frame ('/lib/python312.zip/...') 過濾掉
  const lines = stderr.split("\n");
  const filtered: string[] = [];
  let inUserFrame = false;
  for (const line of lines) {
    // 跳過 pyodide 內部 frame
    if (line.includes("/lib/python") || line.includes("_pyodide/_base.py")) continue;
    // 保留 "<exec>" / "<module>" 的使用者 frame
    if (line.includes('File "<exec>"') || line.match(/^\s+File "/)) {
      inUserFrame = true;
      filtered.push(line);
      continue;
    }
    filtered.push(line);
  }
  return filtered.join("\n").trim();
}

/**
 * 共用 Pyodide 載入 hook
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
        stdout: () => {},
      });
      setProgress("預載 micropip + patch input...");
      await py.loadPackage("micropip");

      // patch input() 避免卡死
      await py.runPythonAsync(`
import builtins
def _nami_input(prompt=""):
    raise RuntimeError("Pyodide 不支援 input()、改用變數：name = 'Nami'")
builtins.input = _nami_input
del _nami_input
`);

      // patch micropip.install 顯示進度
      await py.runPythonAsync(`
import micropip as _micropip
_original_install = _micropip.install
async def install(pkgs, *args, **kwargs):
    if isinstance(pkgs, str):
        pkgs_list = [pkgs]
    else:
        pkgs_list = list(pkgs)
    for p in pkgs_list:
        print(f"📦 安裝 {p}...", flush=True)
    result = await _original_install(pkgs, *args, **kwargs)
    print(f"✅ 安裝完成: {', '.join(pkgs_list)}", flush=True)
    return result
_micropip.install = install
`);

      // 預載資料科學核心 (Pyodide 內建 wheel、~40MB、第一次慢、之後 cache)
      setProgress("預載 numpy / pandas（~10MB、首次慢）...");
      try {
        await py.loadPackage(["numpy", "pandas"]);
        setProgress("預載 matplotlib / scikit-learn / scipy（~30MB）...");
        await py.loadPackage(["matplotlib", "scikit-learn", "scipy"]);
        setProgress("預載 sqlite3 / pillow / lxml...");
        await py.loadPackage(["sqlite3", "pillow", "lxml", "regex", "beautifulsoup4"]);
      } catch (e) {
        console.warn("[pyodide] 部分核心套件載入失敗、後續可手動 micropip.install", e);
      }

      window.__pyodide = py;
      pyodideRef.current = py;
      setProgress("");

      // 背景繼續裝 PyPI 套件 (不阻塞 ready 狀態)
      setTimeout(() => {
        py.runPythonAsync(`
import micropip
# 業界常用、background install
async def _bg():
    pkgs = ["fastapi", "httpx", "flask", "openpyxl", "pytz", "python-dateutil", "plotly"]
    for p in pkgs:
        try:
            await _original_install(p)
        except Exception as e:
            pass
import asyncio
asyncio.ensure_future(_bg())
`).catch(() => {});
      }, 1000);

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
   * run python code
   * - 全域 mutex：不同 Tab 不會 stdout 串台
   * - output 自動截斷
   * - error stack trace 簡化
   * - input() 攔截
   */
  const run = useCallback(
    async (code: string, onStdout?: (chunk: string) => void): Promise<RunResult> => {
      let py = pyodideRef.current ?? window.__pyodide;
      if (!py) {
        py = await load();
        if (!py) return { stdout: "", stderr: error ?? "Pyodide 沒載入成功", result: null, ok: false };
      }

      // 等前一個 run 結束
      const prevMutex = window.__pyodideRunMutex ?? Promise.resolve();
      let release: (() => void) = () => {};
      window.__pyodideRunMutex = new Promise<void>((r) => { release = r; });
      await prevMutex;

      let stdout = "";
      let stderr = "";
      try {
        py.setStdout({
          batched: (s: string) => {
            if (stdout.length < MAX_STDOUT_CHARS * 1.2) {
              stdout += s + "\n";
              onStdout?.(s);
            }
          },
        });
        py.setStderr({
          batched: (s: string) => {
            if (stderr.length < MAX_STDOUT_CHARS * 1.2) {
              stderr += s + "\n";
            }
          },
        });

        const result = await py.runPythonAsync(code);
        let resultStr: any = null;
        if (result !== undefined && result !== null) {
          try {
            resultStr = result.toString();
          } catch {
            resultStr = String(result);
          }
        }

        const truncOut = truncateOutput(stdout);
        const truncErr = truncateOutput(stderr);

        return {
          stdout: truncOut.text,
          stderr: truncErr.text,
          result: resultStr,
          ok: !stderr,
          truncated: truncOut.truncated || truncErr.truncated,
        };
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        const simplified = simplifyTraceback(stderr + "\n" + msg);
        const truncOut = truncateOutput(stdout);
        return {
          stdout: truncOut.text,
          stderr: simplified,
          result: null,
          ok: false,
          truncated: truncOut.truncated,
        };
      } finally {
        release();
      }
    },
    [load, error],
  );

  /**
   * 重設 Python kernel：清掉所有 user 變數、保留 micropip 已裝套件
   */
  const reset = useCallback(async () => {
    const py = pyodideRef.current ?? window.__pyodide;
    if (!py) return;
    await py.runPythonAsync(`
# 清 user 變數 (保留 builtins / installed modules)
_keep = {'__name__', '__doc__', '__package__', '__loader__', '__spec__', '__builtins__', '_keep'}
for _k in list(globals().keys()):
    if _k not in _keep and not _k.startswith('_'):
        try:
            del globals()[_k]
        except Exception:
            pass
import gc
gc.collect()
print("✨ Python kernel 已重設、變數清空 (已裝套件保留)")
`);
  }, []);

  return { status, progress, error, load, run, reset };
}
