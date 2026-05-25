/**
 * Pyodide Web Worker — 把 Python runtime 放到背景執行緒
 * main thread 100% 流暢、跑 numpy 大運算不卡 UI
 *
 * 通訊協定（main ↔ worker）：
 *   { id, type: "init",  payload: { indexURL } }            → main 用 reply { id, ok, error? }
 *   { id, type: "run",   payload: { code } }                → reply { id, ok, stdout, stderr, result, error? }
 *   { id, type: "reset" }                                     → reply { id, ok }
 *
 * stdout / stderr 在跑 run 期間會以 { id, type:"chunk", kind, text } 多次 stream 出來
 */

const PYODIDE_CDNS = [
  "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
  "https://unpkg.com/pyodide@0.26.4/full/",
];

let pyodide = null;
let activeIndexURL = null;

async function loadPyodideWithFallback() {
  if (pyodide) return pyodide;
  for (const cdn of PYODIDE_CDNS) {
    try {
      importScripts(cdn + "pyodide.js");
      pyodide = await self.loadPyodide({
        indexURL: cdn,
        stdout: () => {},
        stderr: () => {},
      });
      activeIndexURL = cdn;
      // 預載 micropip
      await pyodide.loadPackage("micropip");

      // patch input() / micropip / nami_fetch (跟 main thread 版本一致)
      await pyodide.runPythonAsync(`
import builtins as _b
import json as _json

def _no_input(p=""): raise RuntimeError("Pyodide 不支援 input()、改用變數")
_b.input = _no_input

import micropip as _m
_orig = _m.install
async def install(pkgs, *args, **kwargs):
    if isinstance(pkgs, str): pkgs = [pkgs]
    for p in pkgs: print(f"📦 安裝 {p}...", flush=True)
    kwargs.setdefault("keep_going", True)
    try:
        r = await _orig(pkgs, *args, **kwargs)
        print(f"✅ 完成", flush=True)
        return r
    except Exception as e:
        print(f"⚠️ 部分失敗: {str(e)[:200]}", flush=True)
_m.install = install

async def nami_fetch(url, as_json=False):
    """worker 內版本：postMessage 給 main、main 走 admin proxy"""
    raise RuntimeError("在 Worker 模式、nami_fetch 還沒接通、用 main thread 模式跑")

_b.nami_fetch = nami_fetch
`);
      return pyodide;
    } catch (e) {
      console.warn(`[worker] CDN ${cdn} 失敗:`, e?.message);
    }
  }
  throw new Error("所有 Pyodide CDN 都失敗");
}

self.onmessage = async (e) => {
  const { id, type, payload } = e.data || {};
  try {
    if (type === "init") {
      await loadPyodideWithFallback();
      self.postMessage({ id, ok: true, indexURL: activeIndexURL });
      return;
    }

    if (!pyodide) {
      self.postMessage({ id, ok: false, error: "Pyodide 未 init、先 send init" });
      return;
    }

    if (type === "run") {
      let stdout = "", stderr = "";
      pyodide.setStdout({
        batched: (s) => {
          stdout += s + "\n";
          self.postMessage({ id, type: "chunk", kind: "stdout", text: s });
        },
      });
      pyodide.setStderr({
        batched: (s) => {
          stderr += s + "\n";
          self.postMessage({ id, type: "chunk", kind: "stderr", text: s });
        },
      });
      try {
        const result = await pyodide.runPythonAsync(payload.code);
        let resultStr = null;
        if (result !== undefined && result !== null) {
          try { resultStr = result.toString(); } catch { resultStr = String(result); }
        }
        self.postMessage({
          id,
          ok: !stderr,
          type: "done",
          stdout,
          stderr,
          result: resultStr,
        });
      } catch (err) {
        self.postMessage({
          id,
          ok: false,
          type: "done",
          stdout,
          stderr: stderr + (err?.message ?? String(err)),
          result: null,
          error: err?.message,
        });
      }
      return;
    }

    if (type === "reset") {
      await pyodide.runPythonAsync(`
_keep = {'__name__', '__doc__', '__package__', '__loader__', '__spec__', '__builtins__'}
for _k in list(globals().keys()):
    if _k not in _keep and not _k.startswith('_'):
        try: del globals()[_k]
        except: pass
import gc; gc.collect()
print("✨ kernel 已重設")
`);
      self.postMessage({ id, ok: true });
      return;
    }

    self.postMessage({ id, ok: false, error: `unknown type: ${type}` });
  } catch (e) {
    self.postMessage({ id, ok: false, error: e?.message ?? String(e) });
  }
};

self.postMessage({ ready: true });
