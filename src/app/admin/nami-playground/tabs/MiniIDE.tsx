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

  const runMain = async () => {
    if (running) return;
    setRunning(true);
    setOutput("");
    setStderr("");

    // 1. 把所有 .py 檔寫到 Pyodide FS
    // 2. sys.path 加入 /home/pyodide (預設) + /sandbox
    // 3. exec main.py
    const setupCode = `
import sys, os
SANDBOX = "/sandbox"
if not os.path.exists(SANDBOX):
    os.makedirs(SANDBOX)
if SANDBOX not in sys.path:
    sys.path.insert(0, SANDBOX)

# 清掉舊 module cache、確保改檔有重 import
_to_clear = [m for m in sys.modules.keys() if m in ${JSON.stringify(files.filter(f => f.name.endsWith(".py") && f.name !== "main.py").map(f => f.name.replace(/\.py$/, "")))}]
for m in _to_clear:
    del sys.modules[m]
`;

    // 寫每個檔
    const fileWrites = files
      .filter((f) => f.name.endsWith(".py"))
      .map((f) =>
        `with open("/sandbox/${f.name}", "w") as _f:\n    _f.write(${JSON.stringify(f.content)})`
      )
      .join("\n");

    const mainFile = files.find((f) => f.name === "main.py" || f.name === activeName);
    if (!mainFile) {
      setStderr("找不到 main.py 或當前選擇的檔");
      setRunning(false);
      return;
    }

    // 跑：先 setup、寫所有檔、執行當前 active file (若是 .py)
    const execTarget = activeName.endsWith(".py") ? activeName : "main.py";
    const fullCode = `${setupCode}\n\n${fileWrites}\n\nexec(open("/sandbox/${execTarget}").read())`;

    const r = await run(fullCode);
    setOutput(r.stdout);
    setStderr(r.stderr);
    setRunning(false);
  };

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
            disabled={running || status !== "ready"}
            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold text-xs inline-flex items-center gap-1 disabled:opacity-50"
          >
            {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
            執行 {activeName.endsWith(".py") ? activeName : "main.py"}
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

        {/* Output */}
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted inline-flex items-center justify-between">
            <span>💬 terminal output</span>
            {status === "loading" && <span className="text-[10px] text-fg-muted inline-flex items-center gap-1"><Loader2 size={9} className="animate-spin" /> {progress}</span>}
            {status === "ready" && <span className="text-[10px] text-emerald-400">● ready</span>}
            {status === "idle" && <button onClick={load} className="text-[10px] text-purple-300">載入 Python</button>}
          </div>
          <div className="flex-1 min-h-[500px] p-3 bg-[#0d1117] overflow-y-auto font-mono text-xs">
            {!output && !stderr && (
              <div className="text-fg-muted/60">
                // 多檔案 mini-IDE<br/>
                // - 切 file tab 切換編輯<br/>
                // - main.py 可 import 其他 .py (例：<code>from utils import greet</code>)<br/>
                // - 改完按「執行 main.py」、會把所有檔寫到 Pyodide FS 再跑<br/>
                // - 自動存 localStorage、重整還在
              </div>
            )}
            {output && <pre className="whitespace-pre-wrap text-[#e6edf3]">{output}</pre>}
            {stderr && <pre className="whitespace-pre-wrap text-red-400 mt-2">{stderr}</pre>}
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="rounded-xl bg-bg-elevated/30 border border-border p-3 text-[11px] text-fg-muted leading-relaxed">
        <div className="font-bold text-fg mb-1">💡 多檔案使用方式</div>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>main.py 是入口、用 <code className="bg-bg px-1 rounded">from utils import greet</code> 引用其他檔</li>
          <li>每個 .py 檔都在 Pyodide 虛擬 FS <code className="bg-bg px-1 rounded">/sandbox/</code>、執行前自動寫入</li>
          <li>module cache 每次 run 會清、改 utils.py 後 main.py 會用新版</li>
          <li>所有檔 autosave 到 localStorage、重整還在</li>
          <li>業界：把長 code 拆成 utils / models / services 三層、main 入口、可讀性好</li>
        </ul>
      </div>
    </div>
  );
}
