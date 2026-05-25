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

      // 注入 nami_fetch helper — 全域可用、自動帶 admin proxy + 友善 error
      await py.runPythonAsync(`
import builtins as _b
import json as _json

async def nami_fetch(url, as_json=False):
    """爬一個 URL、走 admin proxy、自動 .to_py() + error handling
    用法：
        text = await nami_fetch("https://books.toscrape.com")
        data = await nami_fetch("https://api.github.com/users/octocat", as_json=True)
    """
    from js import fetch as _fetch, encodeURIComponent as _enc
    resp = await _fetch("/api/admin/playground/scrape?url=" + _enc(url))
    raw = (await resp.json()).to_py()
    if not raw.get("body"):
        err = raw.get("error", "unknown")
        msg = raw.get("message", "")
        hint = ""
        if err == "host_not_allowed":
            hint = "\\n💡 此網址 host 不在 allowlist、見 ScrapeLab 預設站清單"
        elif err == "rate_limited":
            hint = "\\n💡 每小時 100 次限制、稍等再試"
        elif err == "timeout":
            hint = "\\n💡 對方 server 慢 / 沒回應、換別的 URL"
        raise RuntimeError(f"❌ nami_fetch 失敗 [{err}]: {msg}{hint}")
    body = raw["body"]
    if as_json:
        try:
            return _json.loads(body)
        except _json.JSONDecodeError as e:
            raise RuntimeError(f"❌ 拿到的不是合法 JSON: {str(e)[:100]}")
    return body

_b.nami_fetch = nami_fetch
`);

      // 完全 lazy：不預載任何套件、加速 ready
      // user 跑到 import numpy 時、Pyodide 會自動 micropip.install
      // 這樣首次 ready 從 ~30s → ~5s
      window.__pyodide = py;
      pyodideRef.current = py;
      setProgress("");

      // 超低優先級：page idle 5 秒後再背景預載最常用的 numpy
      // 不阻塞 ready、不影響 user 即時操作
      if (typeof (globalThis as any).requestIdleCallback !== "undefined") {
        setTimeout(() => {
          (globalThis as any).requestIdleCallback(
            () => { py.loadPackage(["numpy", "pandas"]).catch(() => {}); },
            { timeout: 30000 }
          );
        }, 5000);
      }

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
