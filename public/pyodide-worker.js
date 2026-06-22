/**
 * Pyodide Web Worker — 把 Python runtime 放到背景執行緒
 * main thread 永遠流暢、跑 numpy / matplotlib 大運算 UI 不卡
 *
 * 通訊：
 *   main → worker: { id, type, payload }
 *   worker → main:
 *     - { id, type: "progress", phaseIdx, phaseName }     init 階段 progress
 *     - { id, type: "chunk", kind: "stdout"|"stderr", text } run 時 streaming
 *     - { id, type: "done", ok, stdout, stderr, result }     run 結束
 *     - { id, ok, error? }                                    init / reset reply
 */

const PYODIDE_CDNS = [
  "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
  "https://unpkg.com/pyodide@0.26.4/full/",
  "https://pyodide-cdn2.iodide.io/v0.26.4/full/",
];

const PHASES = [
  { id: "script",   name: "下載 pyodide.js" },
  { id: "vm",       name: "啟動 Python VM" },
  { id: "micropip", name: "預載 micropip + helpers" },
  { id: "core",     name: "預載 numpy / pandas" },
  { id: "viz",      name: "預載 matplotlib" },
  { id: "scrape",   name: "預載 lxml / bs4 / regex / pillow" },
  { id: "ml",       name: "預載 scikit-learn / scipy" },
  { id: "web",      name: "預載 fastapi / flask / httpx" },
];

let pyodide = null;
let activeIndexURL = null;

function sendProgress(id, phaseIdx, phaseName) {
  self.postMessage({ id, type: "progress", phaseIdx, phaseName });
}

async function initPyodide(initId) {
  if (pyodide) return pyodide;

  // Phase 0: 找一個能用的 CDN、importScripts pyodide.js
  for (let i = 0; i < PYODIDE_CDNS.length; i++) {
    const cdn = PYODIDE_CDNS[i];
    sendProgress(initId, 0, `下載 pyodide.js（${new URL(cdn).hostname}）`);
    try {
      importScripts(cdn + "pyodide.js");
      activeIndexURL = cdn;
      break;
    } catch (e) {
      if (i === PYODIDE_CDNS.length - 1) throw new Error(`所有 CDN 失敗: ${e?.message}`);
    }
  }

  // Phase 1: 啟動 VM
  sendProgress(initId, 1, PHASES[1].name);
  pyodide = await self.loadPyodide({
    indexURL: activeIndexURL,
    stdout: () => {},
    stderr: () => {},
  });

  // Phase 2: micropip + patches
  sendProgress(initId, 2, PHASES[2].name);
  await pyodide.loadPackage("micropip");
  await pyodide.runPythonAsync(`
import builtins as _b
import json as _json

def _no_input(p=""):
    raise RuntimeError("Pyodide 不支援 input()、改用變數：name = 'Nami'")
_b.input = _no_input

# patch micropip 預設 keep_going=True
import micropip as _m
_orig_install = _m.install
async def install(pkgs, *args, **kwargs):
    if isinstance(pkgs, str): pkgs = [pkgs]
    for p in pkgs: print(f"📦 安裝 {p}...", flush=True)
    kwargs.setdefault("keep_going", True)
    try:
        r = await _orig_install(pkgs, *args, **kwargs)
        print(f"✅ 完成", flush=True)
        return r
    except Exception as e:
        print(f"⚠️ 部分失敗: {str(e)[:200]}", flush=True)
_m.install = install

# nami_fetch helper (透過 main thread proxy)
async def nami_fetch(url, as_json=False):
    """Worker 模式：發訊息到 main、main 走 admin proxy 後回"""
    from js import postMessage as _post, Promise as _Promise, addEventListener as _add
    import asyncio
    # 簡化：worker 內 fetch 走 self.fetch (worker scope 有 fetch、走 admin proxy 一樣 work)
    from js import fetch as _fetch, encodeURIComponent as _enc
    resp = await _fetch("/api/admin/playground/scrape?url=" + _enc(url))
    raw = (await resp.json()).to_py()
    if not raw.get("body"):
        err = raw.get("error", "unknown"); msg = raw.get("message", "")
        raise RuntimeError(f"❌ nami_fetch 失敗 [{err}]: {msg}")
    body = raw["body"]
    if as_json:
        return _json.loads(body)
    return body
_b.nami_fetch = nami_fetch
`);

  // Phase 3-7: 預載套件
  const loadPhase = async (idx, pkgs) => {
    sendProgress(initId, idx, PHASES[idx].name);
    try { await pyodide.loadPackage(pkgs); } catch (e) { /* skip */ }
  };
  await loadPhase(3, ["numpy", "pandas"]);
  await loadPhase(4, ["matplotlib"]);
  // 讓 plt.show() 自動把每張圖輸出成 __IMAGE__<base64>（worker 會抓出來、前端直接顯示圖表）
  try {
    await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use("AGG")
import matplotlib.pyplot as _plt, io as _io, base64 as _b64
def _nami_show(*a, **k):
    import matplotlib.pyplot as p
    for _num in p.get_fignums():
        _fig = p.figure(_num)
        _buf = _io.BytesIO()
        _fig.savefig(_buf, format="png", bbox_inches="tight", dpi=110)
        _buf.seek(0)
        print("__IMAGE__" + _b64.b64encode(_buf.read()).decode())
        p.close(_fig)
_plt.show = _nami_show
`);
  } catch (e) { /* matplotlib patch skip */ }
  await loadPhase(5, ["lxml", "beautifulsoup4", "regex", "pillow", "sqlite3"]);
  await loadPhase(6, ["scikit-learn", "scipy"]);

  // Phase 7: PyPI web pkgs (FastAPI v0.99 + pydantic v1)
  sendProgress(initId, 7, PHASES[7].name);
  try {
    await pyodide.runPythonAsync(`
import micropip
await micropip.install(["fastapi==0.99.1", "pydantic<2", "httpx", "starlette<0.28"], keep_going=True)
await micropip.install(["flask"], keep_going=True)
`);
  } catch (e) { /* skip */ }

  return pyodide;
}

self.onmessage = async (e) => {
  const { id, type, payload } = e.data || {};
  try {
    if (type === "init") {
      await initPyodide(id);
      self.postMessage({ id, ok: true, indexURL: activeIndexURL });
      return;
    }

    if (!pyodide) {
      self.postMessage({ id, ok: false, error: "Pyodide 未 init" });
      return;
    }

    if (type === "run") {
      let stdout = "", stderr = "";
      const images = [];
      // 偵測 __IMAGE__<base64>、單獨抽出來不混 stdout (避免 200KB cap 把 image 截掉)
      const handleStdoutLine = (s) => {
        const m = /^__IMAGE__([A-Za-z0-9+/=]+)$/.exec(s.trim());
        if (m) {
          const b64 = m[1];
          images.push(b64);
          self.postMessage({ id, type: "chunk", kind: "image", b64 });
          return;
        }
        stdout += s + "\n";
        self.postMessage({ id, type: "chunk", kind: "stdout", text: s });
      };
      pyodide.setStdout({ batched: handleStdoutLine });
      pyodide.setStderr({
        batched: (s) => {
          stderr += s + "\n";
          self.postMessage({ id, type: "chunk", kind: "stderr", text: s });
        },
      });
      // stdin 互動：把下方 stdin 欄位內容餵給 input()（一行一個、會 echo 出來像終端機）。
      try {
        const stdinLines = typeof payload.stdin === "string" && payload.stdin.length
          ? payload.stdin.replace(/\r\n/g, "\n").split("\n") : [];
        await pyodide.runPythonAsync(
          "import builtins as _b\n" +
          "__nami_stdin = " + JSON.stringify(stdinLines) + "\n" +
          "def _nami_input(prompt=''):\n" +
          "    if prompt: print(prompt, end='', flush=True)\n" +
          "    if __nami_stdin:\n" +
          "        _line = __nami_stdin.pop(0)\n" +
          "        print(_line, flush=True)\n" +
          "        return _line\n" +
          "    raise EOFError('沒有更多輸入了 — 在下方 stdin 欄位多填幾行再執行')\n" +
          "_b.input = _nami_input\n"
        );
      } catch { /* 設定 input 失敗不擋執行 */ }
      try {
        const result = await pyodide.runPythonAsync(payload.code);
        let resultStr = null;
        if (result !== undefined && result !== null) {
          try { resultStr = result.toString(); } catch { resultStr = String(result); }
        }
        // truncate stdout only (images 已單獨送)
        if (stdout.length > 500000) stdout = stdout.substring(0, 500000) + "\n\n... (省略 " + (stdout.length - 500000) + " 字元)";
        self.postMessage({ id, type: "done", ok: !stderr, stdout, stderr, result: resultStr, images });
      } catch (err) {
        self.postMessage({
          id,
          type: "done",
          ok: false,
          stdout,
          stderr: stderr + (err?.message ?? String(err)),
          result: null,
          images,
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
print("✨ kernel 已重設、變數清空")
`);
      self.postMessage({ id, ok: true });
      return;
    }

    self.postMessage({ id, ok: false, error: `unknown type: ${type}` });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err?.message ?? String(err) });
  }
};

self.postMessage({ ready: true });
