"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Loader2, FileCode, Plus, X, Trash2, Download, FolderOpen } from "lucide-react";
import { usePyodide } from "@/hooks/usePyodide";
import { CodeEditor, loadEditorValue } from "@/components/ui/CodeEditor";
import { AskAI } from "@/components/nami/AskAI";

type FileEntry = {
  name: string;     // 'main.py' / 'utils.py'
  content: string;
};

const STORAGE_KEY = "nami:ide-files";
const ACTIVE_KEY = "nami:ide-active";

const DEFAULT_FILES: FileEntry[] = [
  {
    name: "main.py",
    content: `# main.py — 入口、import 別的檔
from utils import greet, add
from data_loader import load_users

print(greet("Nami"))
print("1 + 2 =", add(1, 2))

users = load_users()
print(f"\\n載入 {len(users)} 個 user：")
for u in users:
    print(f"  - {u['name']} ({u['age']}歲)")
`,
  },
  {
    name: "utils.py",
    content: `# utils.py — 工具函式、可被 main 引用
def greet(name):
    return f"👋 哈囉 {name}！這是多檔案 IDE。"

def add(a, b):
    return a + b
`,
  },
  {
    name: "data_loader.py",
    content: `# data_loader.py — 模擬從 DB 載資料
def load_users():
    return [
        {"id": 1, "name": "Alice", "age": 25},
        {"id": 2, "name": "Bob",   "age": 30},
        {"id": 3, "name": "Carol", "age": 28},
    ]
`,
  },
];

function loadFiles(): FileEntry[] {
  if (typeof window === "undefined") return DEFAULT_FILES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_FILES;
}

function saveFiles(files: FileEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch {}
}

function langForFile(name: string): "python" | "javascript" | "html" | "css" | "sql" {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "py") return "python";
  if (ext === "js" || ext === "mjs") return "javascript";
  if (ext === "html") return "html";
  if (ext === "css") return "css";
  if (ext === "sql") return "sql";
  return "python";
}

type RunMode = "python" | "web" | "javascript" | "sql";
function runModeForFile(name: string): RunMode {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "py") return "python";
  if (ext === "html" || ext === "css") return "web";
  if (ext === "js" || ext === "mjs") return "javascript";
  if (ext === "sql") return "sql";
  return "python";
}

export function MiniIDE() {
  const { status, progress, error, load, run } = usePyodide();
  const [files, setFiles] = useState<FileEntry[]>(() => loadFiles());
  const [activeName, setActiveName] = useState<string>(() => {
    if (typeof window === "undefined") return "main.py";
    return localStorage.getItem(ACTIVE_KEY) ?? "main.py";
  });
  const [output, setOutput] = useState<string>("");
  const [stderr, setStderr] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  // iframe preview (html/js 用、Python/SQL 不顯示)
  const [previewSrcDoc, setPreviewSrcDoc] = useState<string>("");

  // autosave files
  useEffect(() => {
    saveFiles(files);
  }, [files]);
  useEffect(() => {
    try { localStorage.setItem(ACTIVE_KEY, activeName); } catch {}
  }, [activeName]);

  const active = files.find((f) => f.name === activeName) ?? files[0];

  const updateContent = (content: string) => {
    setFiles((prev) => prev.map((f) => (f.name === activeName ? { ...f, content } : f)));
  };

  const addFile = () => {
    let name = newFileName.trim();
    if (!name) name = `untitled-${files.length + 1}.py`;
    if (!name.includes(".")) name += ".py";
    if (files.find((f) => f.name === name)) {
      alert("檔名已存在");
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) {
      alert("檔名只能英數 + _ - .");
      return;
    }
    setFiles((prev) => [...prev, { name, content: "" }]);
    setActiveName(name);
    setNewFileName("");
  };

  const removeFile = (name: string) => {
    if (files.length === 1) {
      alert("至少要留一個檔");
      return;
    }
    if (!confirm(`刪除 ${name}？`)) return;
    const next = files.filter((f) => f.name !== name);
    setFiles(next);
    if (activeName === name) setActiveName(next[0].name);
  };

  const downloadAll = () => {
    // 打包成單一 .zip 比較複雜、用 JSON 替代
    const blob = new Blob([JSON.stringify(files, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nami-ide-files.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const mode = runModeForFile(activeName);

  // ─── Web mode: 把所有 .html / .css / .js 合成 srcDoc 給 iframe 跑 ───
  const buildWebSrcDoc = (): string => {
    // 1. 找 active 的 .html (或 index.html 或第一個 .html)
    const htmlFile =
      files.find((f) => f.name === activeName && f.name.endsWith(".html")) ||
      files.find((f) => f.name === "index.html") ||
      files.find((f) => f.name.endsWith(".html"));
    let html = htmlFile?.content ?? `<!doctype html><html><body>${activeName.endsWith(".css") || activeName.endsWith(".js") ? "<!-- 沒找到 .html 檔、預覽 " + activeName + " -->" : ""}</body></html>`;

    // 2. 注入所有 .css 為 <style>
    const cssBlocks = files
      .filter((f) => f.name.endsWith(".css"))
      .map((f) => `<style data-source="${f.name}">\n${f.content}\n</style>`)
      .join("\n");
    if (cssBlocks) {
      if (html.includes("</head>")) html = html.replace("</head>", `${cssBlocks}\n</head>`);
      else html = `<head>${cssBlocks}</head>\n${html}`;
    }

    // 3. 注入所有 .js 為 <script>、並 hook console.log 把 output 傳回 parent
    const consoleHook = `
<script>
(function() {
  const orig = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  function send(level, args) {
    const txt = args.map(a => {
      try { return typeof a === "object" ? JSON.stringify(a) : String(a); } catch { return String(a); }
    }).join(" ");
    window.parent.postMessage({ __nami_console: true, level, text: txt }, "*");
  }
  console.log = (...a) => { orig.log(...a); send("log", a); };
  console.warn = (...a) => { orig.warn(...a); send("warn", a); };
  console.error = (...a) => { orig.error(...a); send("error", a); };
  console.info = (...a) => { orig.info(...a); send("info", a); };
  window.addEventListener("error", (e) => send("error", [e.message + " @ " + (e.filename||"?") + ":" + (e.lineno||"?")]));
})();
</script>`;
    const jsBlocks = files
      .filter((f) => f.name.endsWith(".js") || f.name.endsWith(".mjs"))
      .map((f) => `<script data-source="${f.name}">\n${f.content}\n</script>`)
      .join("\n");
    const allScripts = consoleHook + (jsBlocks ? "\n" + jsBlocks : "");
    if (html.includes("</body>")) html = html.replace("</body>", `${allScripts}\n</body>`);
    else html = `${html}\n${allScripts}`;

    return html;
  };

  // ─── JS-only mode: 沒 html、純 JS 在 sandbox iframe eval ───
  const buildJsSrcDoc = (): string => {
    const activeJs = files.find((f) => f.name === activeName);
    const otherJs = files.filter((f) => (f.name.endsWith(".js") || f.name.endsWith(".mjs")) && f.name !== activeName);
    const otherCode = otherJs.map((f) => `// ─── ${f.name} ───\n${f.content}`).join("\n\n");
    return `<!doctype html><html><body>
<pre id="out" style="white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:12px;color:#e6edf3;background:#0d1117;padding:10px;margin:0;min-height:100vh"></pre>
<script>
(function() {
  const out = document.getElementById("out");
  function send(level, args) {
    const txt = args.map(a => { try { return typeof a === "object" ? JSON.stringify(a, null, 2) : String(a); } catch { return String(a); } }).join(" ");
    out.textContent += "[" + level + "] " + txt + "\\n";
    window.parent.postMessage({ __nami_console: true, level, text: txt }, "*");
  }
  console.log = (...a) => send("log", a);
  console.warn = (...a) => send("warn", a);
  console.error = (...a) => send("error", a);
  console.info = (...a) => send("info", a);
  window.addEventListener("error", (e) => send("error", [e.message]));
  try {
${otherCode}
${activeJs?.content ?? ""}
  } catch (e) { send("error", [e.message + "\\n" + e.stack]); }
})();
</script>
</body></html>`;
  };

  // ─── Python mode (既有邏輯) ───
  const runPython = async () => {
    const setupCode = `
import sys, os
SANDBOX = "/sandbox"
if not os.path.exists(SANDBOX):
    os.makedirs(SANDBOX)
if SANDBOX not in sys.path:
    sys.path.insert(0, SANDBOX)

_to_clear = [m for m in sys.modules.keys() if m in ${JSON.stringify(files.filter(f => f.name.endsWith(".py") && f.name !== "main.py").map(f => f.name.replace(/\.py$/, "")))}]
for m in _to_clear:
    del sys.modules[m]
`;
    const fileWrites = files
      .filter((f) => f.name.endsWith(".py"))
      .map((f) => `with open("/sandbox/${f.name}", "w") as _f:\n    _f.write(${JSON.stringify(f.content)})`)
      .join("\n");
    const execTarget = activeName.endsWith(".py") ? activeName : "main.py";
    const fullCode = `${setupCode}\n\n${fileWrites}\n\nexec(open("/sandbox/${execTarget}").read())`;
    const r = await run(fullCode);
    setOutput(r.stdout);
    setStderr(r.stderr);
  };

  // ─── SQL mode: 用 Pyodide 內 sqlite3 跑 ───
  const runSql = async () => {
    const sqlFile = files.find((f) => f.name === activeName);
    if (!sqlFile) { setStderr("沒有 SQL 檔"); return; }
    const code = `
import sqlite3, sys
conn = sqlite3.connect(":memory:")
cur = conn.cursor()
sql_text = ${JSON.stringify(sqlFile.content)}
# 切 statement (簡單版、依分號)
statements = [s.strip() for s in sql_text.split(";") if s.strip()]
print(f"執行 {len(statements)} 個 SQL statement\\n")
for i, stmt in enumerate(statements, 1):
    preview = (stmt[:60] + "...") if len(stmt) > 60 else stmt
    try:
        cur.execute(stmt)
        if cur.description:  # SELECT 類
            cols = [d[0] for d in cur.description]
            rows = cur.fetchall()
            print(f"[{i}] {preview}")
            print(f"    → 回 {len(rows)} 列")
            if rows:
                print("    " + " | ".join(cols))
                print("    " + "-" * (len(" | ".join(cols))))
                for r in rows[:20]:
                    print("    " + " | ".join(str(v) for v in r))
                if len(rows) > 20:
                    print(f"    ... 還有 {len(rows) - 20} 列")
        else:
            print(f"[{i}] {preview}  → 影響 {cur.rowcount} 列")
    except Exception as e:
        print(f"[{i}] ❌ {preview}")
        print(f"    {e}")
    print()
conn.close()
`;
    const r = await run(code);
    setOutput(r.stdout);
    setStderr(r.stderr);
  };

  const runMain = async () => {
    if (running) return;
    setRunning(true);
    setOutput("");
    setStderr("");
    setPreviewSrcDoc("");

    try {
      if (mode === "python") {
        await runPython();
      } else if (mode === "sql") {
        await runSql();
      } else if (mode === "web") {
        setPreviewSrcDoc(buildWebSrcDoc());
      } else if (mode === "javascript") {
        setPreviewSrcDoc(buildJsSrcDoc());
      }
    } catch (e: any) {
      setStderr(e?.message ?? String(e));
    }
    setRunning(false);
  };

  // 接 iframe 的 console.log
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data && (e.data as any).__nami_console) {
        const { level, text } = e.data as any;
        setOutput((prev) => prev + `[${level}] ${text}\n`);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="bg-bg-card border border-border rounded-2xl p-3 flex items-center gap-2 flex-wrap">
        <FolderOpen size={14} className="text-purple-400" />
        <span className="text-xs font-bold">Nami IDE</span>
        <span className="text-[10px] text-fg-muted">{files.length} 檔</span>

        <div className="flex items-center gap-1 ml-2">
          <input
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addFile(); }}
            placeholder="新檔名.py"
            className="bg-bg border border-border rounded-lg px-2 py-1 text-xs w-32 outline-none focus:border-purple-400"
          />
          <button onClick={addFile} className="px-2 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs inline-flex items-center gap-0.5">
            <Plus size={11} /> 加檔
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={downloadAll} className="text-[10px] px-2 py-1 rounded border border-border hover:border-emerald-400 inline-flex items-center gap-1">
            <Download size={10} /> 匯出
          </button>
          <AskAI code={active?.content ?? ""} error={stderr} lang={langForFile(activeName)} context={`IDE · ${activeName}`} />
          <button
            onClick={runMain}
            disabled={running || (mode === "python" && status !== "ready") || (mode === "sql" && status !== "ready")}
            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold text-xs inline-flex items-center gap-1 disabled:opacity-50"
            title={
              mode === "python" ? "用 Pyodide 跑 Python" :
              mode === "sql" ? "用 SQLite 跑 SQL" :
              mode === "web" ? "iframe sandbox 渲染 HTML/CSS/JS" :
              "iframe sandbox eval JS"
            }
          >
            {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
            {mode === "python" && `執行 ${activeName.endsWith(".py") ? activeName : "main.py"}`}
            {mode === "sql" && `執行 SQL`}
            {mode === "web" && `渲染預覽`}
            {mode === "javascript" && `跑 JS`}
            <span className="text-[9px] opacity-70 ml-1">[{mode}]</span>
          </button>
        </div>
      </div>

      {/* Editor + Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* File tabs + Editor */}
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center bg-bg-elevated border-b border-border overflow-x-auto">
            {files.map((f) => {
              const isActive = f.name === activeName;
              return (
                <div
                  key={f.name}
                  className={`flex items-center gap-1 px-3 py-2 text-xs cursor-pointer border-r border-border transition ${
                    isActive ? "bg-bg-card text-fg font-bold" : "text-fg-muted hover:text-fg"
                  }`}
                  onClick={() => setActiveName(f.name)}
                >
                  <FileCode size={11} className={isActive ? "text-purple-400" : ""} />
                  <span>{f.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(f.name); }}
                    className="ml-1 opacity-50 hover:opacity-100 hover:text-red-400"
                    title="刪除"
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex-1 min-h-[500px]">
            <CodeEditor
              value={active?.content ?? ""}
              onChange={updateContent}
              onRun={runMain}
              lang={langForFile(activeName)}
              height="500px"
              minHeight="500px"
            />
          </div>
        </div>

        {/* Output: Web/JS 模式顯示 iframe + 下方 console、Python/SQL 顯示 terminal */}
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted inline-flex items-center justify-between">
            <span>
              {mode === "python" && "💬 terminal output (Python)"}
              {mode === "sql" && "💬 SQL 結果 (SQLite)"}
              {mode === "web" && "🌐 iframe 預覽 (HTML/CSS/JS)"}
              {mode === "javascript" && "📜 JS 執行結果"}
            </span>
            {mode === "python" || mode === "sql" ? (
              <>
                {status === "loading" && <span className="text-[10px] text-fg-muted inline-flex items-center gap-1"><Loader2 size={9} className="animate-spin" /> {progress}</span>}
                {status === "ready" && <span className="text-[10px] text-emerald-400">● Python ready</span>}
                {status === "idle" && <button onClick={load} className="text-[10px] text-purple-300">載入 Python</button>}
              </>
            ) : (
              <span className="text-[10px] text-emerald-400">● iframe sandbox</span>
            )}
          </div>

          {/* Web / JS preview */}
          {(mode === "web" || mode === "javascript") && (
            <>
              {previewSrcDoc ? (
                <iframe
                  srcDoc={previewSrcDoc}
                  sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                  className="w-full min-h-[400px] bg-white border-0"
                  title="iframe-preview"
                />
              ) : (
                <div className="flex-1 min-h-[400px] p-3 bg-[#0d1117] text-fg-muted/60 text-xs">
                  // 點「{mode === "web" ? "渲染預覽" : "跑 JS"}」看結果
                </div>
              )}
              {output && (
                <div className="border-t border-border bg-[#0d1117] p-3 font-mono text-xs max-h-40 overflow-y-auto">
                  <div className="text-[10px] text-fg-muted mb-1">console.log:</div>
                  <pre className="whitespace-pre-wrap text-[#e6edf3]">{output}</pre>
                </div>
              )}
            </>
          )}

          {/* Python / SQL terminal */}
          {(mode === "python" || mode === "sql") && (
            <div className="flex-1 min-h-[500px] p-3 bg-[#0d1117] overflow-y-auto font-mono text-xs">
              {!output && !stderr && (
                <div className="text-fg-muted/60">
                  // 多檔案 IDE — 自動依檔名選 runner<br/>
                  // - .py → Pyodide (Python in WASM)、可 import 其他 .py<br/>
                  // - .sql → 內建 SQLite (Pyodide sqlite3)<br/>
                  // - .html / .css / .js → iframe sandbox 渲染<br/>
                  // - 自動存 localStorage、重整還在
                </div>
              )}
              {output && <pre className="whitespace-pre-wrap text-[#e6edf3]">{output}</pre>}
              {stderr && <pre className="whitespace-pre-wrap text-red-400 mt-2">{stderr}</pre>}
            </div>
          )}
        </div>
      </div>

      {/* Tip */}
      <div className="rounded-xl bg-bg-elevated/30 border border-border p-3 text-[11px] text-fg-muted leading-relaxed">
        <div className="font-bold text-fg mb-1">💡 多語言 IDE 使用方式</div>
        <ul className="space-y-0.5 list-disc list-inside">
          <li><b>.py</b> → Pyodide 跑、可 import 其他 .py、numpy/pandas/matplotlib 已預載</li>
          <li><b>.sql</b> → 內建 SQLite、SELECT 結果直接顯示前 20 列</li>
          <li><b>.html + .css + .js</b> → 全部合成 srcDoc 在 iframe sandbox 渲染、改完即時看</li>
          <li><b>.js</b> 沒搭 .html → 純 JS 在 iframe eval、console.log 抓出來</li>
          <li>所有檔 autosave localStorage、重整還在；切 file tab 換編輯</li>
          <li>業界：完整應用通常是「.py 後端 + .sql migration + .html/.css/.js 前端」、全部在這 IDE 一站做完</li>
        </ul>
      </div>
    </div>
  );
}
