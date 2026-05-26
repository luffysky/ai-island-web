"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Loader2, X, Download, Upload, FolderPlus, FilePlus, Save, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { usePyodide } from "@/hooks/usePyodide";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { AskAI } from "@/components/nami/AskAI";
import { FileTree } from "./FileTree";
import {
  loadFs, saveFs, loadActive, saveActive, loadOpenTabs, saveOpenTabs,
  findNode, listAllFiles, getExt, langForExt,
  updateFileContent, addNode, deleteNode, renameNode, toggleFolder,
  type FsTree,
} from "./fs";

type RunMode = "python" | "web" | "javascript" | "sql" | "unsupported";

function runModeForPath(path: string): RunMode {
  const ext = getExt(path);
  if (ext === "py") return "python";
  if (ext === "html" || ext === "css") return "web";
  if (ext === "js" || ext === "mjs") return "javascript";
  if (ext === "sql") return "sql";
  return "unsupported";
}

export function VscodeIDE() {
  const { status, progress, error, load, run } = usePyodide();
  const [tree, setTree] = useState<FsTree>(() => loadFs());
  const [activePath, setActivePath] = useState<string>(() => loadActive());
  const [openTabs, setOpenTabs] = useState<string[]>(() => loadOpenTabs());
  const [output, setOutput] = useState("");
  const [stderr, setStderr] = useState("");
  const [running, setRunning] = useState(false);
  const [previewSrcDoc, setPreviewSrcDoc] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // autosave
  useEffect(() => { saveFs(tree); }, [tree]);
  useEffect(() => { saveActive(activePath); }, [activePath]);
  useEffect(() => { saveOpenTabs(openTabs); }, [openTabs]);

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

  const activeNode = findNode(tree, activePath);
  const activeFile = activeNode?.node.type === "file" ? activeNode.node : null;
  const activeLang = langForExt(getExt(activePath));
  const mode = runModeForPath(activePath);

  // ─── 操作 ───
  const openFile = (path: string) => {
    setActivePath(path);
    if (!openTabs.includes(path)) setOpenTabs([...openTabs, path]);
  };

  const closeTab = (path: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = openTabs.filter((t) => t !== path);
    setOpenTabs(next);
    if (activePath === path) {
      setActivePath(next[next.length - 1] ?? "");
    }
  };

  const updateContent = (content: string) => {
    if (!activeFile) return;
    setTree(updateFileContent(tree, activePath, content));
  };

  const onAddFile = (parentPath: string) => {
    const name = window.prompt(`在「${parentPath || "/"}」新增檔案 (例：app.py / data.json / index.html)`);
    if (!name) return;
    if (!/^[a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+$/.test(name)) {
      alert("檔名格式：英數 + _ - . 且要有副檔名");
      return;
    }
    try {
      const next = addNode(tree, parentPath, { type: "file", name, content: "" });
      setTree(next);
      const newPath = parentPath ? `${parentPath}/${name}` : name;
      openFile(newPath);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const onAddFolder = (parentPath: string) => {
    const name = window.prompt(`在「${parentPath || "/"}」新增資料夾`);
    if (!name) return;
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      alert("資料夾名稱只能英數 + _ -");
      return;
    }
    try {
      setTree(addNode(tree, parentPath, { type: "folder", name, children: [], expanded: true }));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const onDelete = (path: string) => {
    if (!confirm(`刪除「${path}」？` + (findNode(tree, path)?.node.type === "folder" ? "\n含底下所有檔案" : ""))) return;
    setTree(deleteNode(tree, path));
    setOpenTabs(openTabs.filter((t) => !t.startsWith(path)));
    if (activePath.startsWith(path)) {
      setActivePath("");
    }
  };

  const onRename = (path: string) => {
    const parts = path.split("/");
    const oldName = parts[parts.length - 1];
    const newName = window.prompt(`重新命名「${path}」`, oldName);
    if (!newName || newName === oldName) return;
    try {
      setTree(renameNode(tree, path, newName));
      // 更新 active path + open tabs
      const newPath = [...parts.slice(0, -1), newName].join("/");
      if (activePath === path) setActivePath(newPath);
      setOpenTabs(openTabs.map((t) => (t === path ? newPath : t.startsWith(path + "/") ? newPath + t.slice(path.length) : t)));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const onToggle = (path: string) => setTree(toggleFolder(tree, path));

  // ─── 執行 ───
  const buildPyodideCode = useCallback(() => {
    const allFiles = listAllFiles(tree);
    // 寫所有檔到 Pyodide /sandbox/、含 folder mkdir
    const pyFiles = allFiles.filter((f) => f.path.endsWith(".py"));
    const folderSet = new Set<string>();
    for (const f of pyFiles) {
      const parts = f.path.split("/");
      let cur = "";
      for (let i = 0; i < parts.length - 1; i++) {
        cur = cur ? `${cur}/${parts[i]}` : parts[i];
        folderSet.add(cur);
      }
    }
    const mkdirs = [...folderSet].map((d) => `os.makedirs("/sandbox/${d}", exist_ok=True)`).join("\n");
    const writes = pyFiles.map((f) =>
      `with open("/sandbox/${f.path}", "w") as _f: _f.write(${JSON.stringify(f.content)})`
    ).join("\n");
    const moduleNames = pyFiles
      .map((f) => f.path.replace(/\.py$/, "").replace(/\//g, "."))
      .filter((m) => m !== "main");
    const setup = `
import sys, os
SANDBOX = "/sandbox"
if not os.path.exists(SANDBOX): os.makedirs(SANDBOX)
if SANDBOX not in sys.path: sys.path.insert(0, SANDBOX)
${mkdirs}
${writes}
# 清舊 module cache
_clear = [m for m in list(sys.modules.keys()) if m in ${JSON.stringify(moduleNames)}]
for _m in _clear:
    try: del sys.modules[_m]
    except: pass
`;
    return `${setup}\n\nexec(open("/sandbox/${activePath}").read())`;
  }, [tree, activePath]);

  const buildWebSrcDoc = useCallback(() => {
    // 找同層的 .html / .css / .js
    const allFiles = listAllFiles(tree);
    const activeDir = activePath.split("/").slice(0, -1).join("/");
    const sameDirFiles = allFiles.filter((f) => f.path.startsWith(activeDir + "/") || (activeDir === "" && !f.path.includes("/")));

    let html = sameDirFiles.find((f) => f.path === activePath && f.path.endsWith(".html"))?.content
      ?? sameDirFiles.find((f) => f.path.endsWith("index.html"))?.content
      ?? sameDirFiles.find((f) => f.path.endsWith(".html"))?.content
      ?? `<!doctype html><html><body><!-- 預覽 ${activePath} --></body></html>`;

    const cssBlocks = sameDirFiles
      .filter((f) => f.path.endsWith(".css"))
      .map((f) => `<style data-source="${f.path}">\n${f.content}\n</style>`)
      .join("\n");
    if (cssBlocks) {
      html = html.includes("</head>")
        ? html.replace("</head>", `${cssBlocks}\n</head>`)
        : `<head>${cssBlocks}</head>\n${html}`;
    }

    const consoleHook = `<script>
(function() {
  function send(level, args) {
    const txt = args.map(a => { try { return typeof a === "object" ? JSON.stringify(a) : String(a); } catch { return String(a); } }).join(" ");
    window.parent.postMessage({ __nami_console: true, level, text: txt }, "*");
  }
  ["log","warn","error","info"].forEach(l => { const o = console[l]; console[l] = (...a) => { o(...a); send(l, a); }; });
  window.addEventListener("error", e => send("error", [e.message + " @ " + (e.filename||"?") + ":" + e.lineno]));
})();
</script>`;
    const jsBlocks = sameDirFiles
      .filter((f) => f.path.endsWith(".js") || f.path.endsWith(".mjs"))
      .map((f) => `<script data-source="${f.path}">\n${f.content}\n</script>`)
      .join("\n");
    const allScripts = consoleHook + (jsBlocks ? "\n" + jsBlocks : "");
    if (html.includes("</body>")) html = html.replace("</body>", `${allScripts}\n</body>`);
    else html = `${html}\n${allScripts}`;
    return html;
  }, [tree, activePath]);

  const buildSqlCode = useCallback(() => {
    if (!activeFile) return "";
    return `
import sqlite3
conn = sqlite3.connect(":memory:")
cur = conn.cursor()
sql_text = ${JSON.stringify(activeFile.content)}
statements = [s.strip() for s in sql_text.split(";") if s.strip()]
print(f"執行 {len(statements)} 個 statement\\n")
for i, stmt in enumerate(statements, 1):
    preview = (stmt[:60] + "...") if len(stmt) > 60 else stmt
    try:
        cur.execute(stmt)
        if cur.description:
            cols = [d[0] for d in cur.description]
            rows = cur.fetchall()
            print(f"[{i}] {preview}")
            print(f"    → {len(rows)} 列")
            if rows:
                print("    " + " | ".join(cols))
                for r in rows[:20]:
                    print("    " + " | ".join(str(v) for v in r))
                if len(rows) > 20: print(f"    ... 還有 {len(rows) - 20} 列")
        else:
            print(f"[{i}] {preview}  → {cur.rowcount} 列影響")
    except Exception as e:
        print(f"[{i}] ❌ {preview}\\n    {e}")
    print()
conn.close()
`;
  }, [activeFile]);

  const runActive = async () => {
    if (running || !activeFile) return;
    setRunning(true);
    setOutput("");
    setStderr("");
    setPreviewSrcDoc("");
    try {
      if (mode === "python") {
        const r = await run(buildPyodideCode());
        setOutput(r.stdout);
        setStderr(r.stderr);
      } else if (mode === "sql") {
        const r = await run(buildSqlCode());
        setOutput(r.stdout);
        setStderr(r.stderr);
      } else if (mode === "web") {
        setPreviewSrcDoc(buildWebSrcDoc());
      } else if (mode === "javascript") {
        // 純 JS、找同層 html、若無就裸跑 JS
        const sameHtml = listAllFiles(tree).find((f) => f.path.endsWith(".html"));
        if (sameHtml) setPreviewSrcDoc(buildWebSrcDoc());
        else {
          setPreviewSrcDoc(`<!doctype html><html><body><pre id="out" style="white-space:pre-wrap;font-family:monospace;font-size:12px;color:#e6edf3;background:#0d1117;padding:10px;min-height:100vh"></pre><script>
const out = document.getElementById("out");
function send(level, args) {
  const txt = args.map(a => { try { return typeof a === "object" ? JSON.stringify(a, null, 2) : String(a); } catch { return String(a); } }).join(" ");
  out.textContent += "[" + level + "] " + txt + "\\n";
  window.parent.postMessage({ __nami_console: true, level, text: txt }, "*");
}
console.log = (...a) => send("log", a);
console.warn = (...a) => send("warn", a);
console.error = (...a) => send("error", a);
window.addEventListener("error", (e) => send("error", [e.message]));
try {
${activeFile.content}
} catch (e) { send("error", [e.message + "\\n" + e.stack]); }
</script></body></html>`);
        }
      } else {
        setStderr(`不支援 .${getExt(activePath)} 執行、目前支援 .py / .sql / .html / .css / .js`);
      }
    } catch (e: any) {
      setStderr(e?.message ?? String(e));
    }
    setRunning(false);
  };

  // ─── 匯出 / 匯入 ───
  const exportAll = () => {
    const blob = new Blob([JSON.stringify(tree, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nami-ide-project.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importAll = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error("格式不對");
        if (!confirm("匯入會覆蓋現有檔案、確定？")) return;
        setTree(parsed);
        setOpenTabs([]);
        setActivePath("");
      } catch (err: any) {
        alert("匯入失敗：" + err.message);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-2">
      {/* 頁面 header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            💻 Nami IDE
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-900 dark:text-purple-100 border border-purple-500/30">VSCode 風</span>
          </h2>
          <p className="text-xs text-fg-muted mt-1">
            真正 file tree + 資料夾 + 多 tab、依檔名自動分流 .py (Pyodide) / .sql (SQLite) / .html+css+js (iframe sandbox)
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <button onClick={importAll} className="px-2.5 py-1 rounded-full border border-border hover:border-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
            <Upload size={11} /> 匯入專案
          </button>
          <button onClick={exportAll} className="px-2.5 py-1 rounded-full border border-border hover:border-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1">
            <Download size={11} /> 匯出
          </button>
          <AskAI code={activeFile?.content ?? ""} error={stderr} lang={activeLang} context={`IDE · ${activePath}`} />
          <button
            onClick={runActive}
            disabled={running || !activeFile || (mode === "python" && status !== "ready") || (mode === "sql" && status !== "ready")}
            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold inline-flex items-center gap-1 disabled:opacity-50"
            title={`mode: ${mode}`}
          >
            {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
            執行 {activePath.split("/").pop() || "—"}
            <span className="text-[9px] opacity-70">[{mode}]</span>
          </button>
        </div>
      </div>

      {/* Python status */}
      <div className="flex items-center gap-2 text-[10px] text-fg-muted">
        {status === "loading" && <><Loader2 size={9} className="animate-spin" /> {progress}</>}
        {status === "ready" && <span className="text-emerald-400">● Pyodide ready</span>}
        {status === "idle" && (
          <button onClick={load} className="text-purple-300 hover:underline">載入 Python</button>
        )}
        {status === "error" && <span className="text-red-400">⚠️ {error}</span>}
      </div>

      {/* Main IDE layout */}
      <div className="grid gap-2" style={{ gridTemplateColumns: sidebarCollapsed ? "30px 1fr" : "260px 1fr" }}>
        {/* Sidebar */}
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: "600px" }}>
          {sidebarCollapsed ? (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="h-full w-full text-fg-muted hover:text-fg flex items-center justify-center"
              title="展開檔案樹"
            >
              <Maximize2 size={14} />
            </button>
          ) : (
            <>
              <div className="px-3 py-2 border-b border-border bg-bg-elevated flex items-center justify-between">
                <span className="text-[10px] font-bold text-fg-muted uppercase tracking-wider">總管理</span>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => onAddFile("")} className="p-1 rounded hover:bg-purple-500/20 text-fg-muted hover:text-purple-300" title="root 新增檔案">
                    <FilePlus size={11} />
                  </button>
                  <button onClick={() => onAddFolder("")} className="p-1 rounded hover:bg-yellow-500/20 text-fg-muted hover:text-yellow-300" title="root 新增資料夾">
                    <FolderPlus size={11} />
                  </button>
                  <button onClick={() => setSidebarCollapsed(true)} className="p-1 rounded hover:bg-bg-elevated text-fg-muted" title="收合">
                    <Minimize2 size={11} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto py-1.5">
                <FileTree
                  tree={tree}
                  activePath={activePath}
                  onSelect={openFile}
                  onToggle={onToggle}
                  onAddFile={onAddFile}
                  onAddFolder={onAddFolder}
                  onDelete={onDelete}
                  onRename={onRename}
                />
              </div>
              <div className="border-t border-border px-3 py-1.5 text-[10px] text-fg-muted">
                hover 檔案 / 資料夾顯示 + - ✏️ 🗑️
              </div>
            </>
          )}
        </div>

        {/* Editor + tabs + output */}
        <div className="space-y-2 min-w-0">
          {/* Tabs */}
          <div className="bg-bg-elevated border border-border rounded-xl flex items-center overflow-x-auto">
            {openTabs.length === 0 && (
              <div className="px-3 py-2 text-xs text-fg-muted/60">沒打開的檔、點左側檔案開始</div>
            )}
            {openTabs.map((path) => {
              const isActive = path === activePath;
              const name = path.split("/").pop() ?? path;
              return (
                <div
                  key={path}
                  onClick={() => setActivePath(path)}
                  className={`group flex items-center gap-1 px-3 py-2 text-xs cursor-pointer border-r border-border whitespace-nowrap ${
                    isActive ? "bg-bg-card text-fg font-bold border-b-2 border-b-purple-400" : "text-fg-muted hover:text-fg"
                  }`}
                  title={path}
                >
                  <span>{name}</span>
                  <button
                    onClick={(e) => closeTab(path, e)}
                    className="ml-1 opacity-50 hover:opacity-100 hover:text-red-400"
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Editor */}
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-3 py-1.5 border-b border-border bg-bg-elevated text-[10px] text-fg-muted font-mono flex items-center gap-1">
              <ChevronRight size={9} />
              <span>{activePath || "(沒選擇檔案)"}</span>
              {activeFile && <span className="ml-auto">{activeFile.content.length} 字</span>}
            </div>
            <div style={{ minHeight: "400px" }}>
              {activeFile ? (
                <CodeEditor
                  value={activeFile.content}
                  onChange={updateContent}
                  onRun={runActive}
                  lang={activeLang as any}
                  height="400px"
                  minHeight="400px"
                />
              ) : (
                <div className="h-[400px] flex items-center justify-center text-fg-muted/60 text-xs">
                  點左側檔案開始編輯
                </div>
              )}
            </div>
          </div>

          {/* Output */}
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-3 py-1.5 border-b border-border bg-bg-elevated text-[10px] text-fg-muted">
              {mode === "python" && "💬 Python output"}
              {mode === "sql" && "💬 SQL 結果"}
              {mode === "web" && "🌐 iframe 預覽 + console.log"}
              {mode === "javascript" && "📜 JS 執行結果"}
              {mode === "unsupported" && `${getExt(activePath) || "—"} 不支援執行`}
            </div>
            {(mode === "web" || mode === "javascript") && previewSrcDoc && (
              <iframe
                srcDoc={previewSrcDoc}
                sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                className="w-full min-h-[300px] bg-white border-0"
                title="iframe-preview"
              />
            )}
            <div className="bg-[#0d1117] p-3 font-mono text-xs max-h-[300px] overflow-y-auto">
              {!output && !stderr && !previewSrcDoc && (
                <div className="text-fg-muted/60">
                  // 點「執行」看結果<br />
                  // .py → Pyodide / .sql → SQLite / .html+css+js → iframe sandbox
                </div>
              )}
              {output && <pre className="whitespace-pre-wrap text-[#e6edf3]">{output}</pre>}
              {stderr && <pre className="whitespace-pre-wrap text-red-400 mt-2">{stderr}</pre>}
            </div>
          </div>
        </div>
      </div>

      {/* 教學 */}
      <div className="rounded-xl bg-bg-elevated/30 border border-border p-3 text-[11px] text-fg-muted leading-relaxed">
        <div className="font-bold text-fg mb-1">💡 VSCode 風 IDE 操作</div>
        <ul className="list-disc list-inside space-y-0.5">
          <li><b>新增檔 / 資料夾</b>：hover 資料夾 → 右側 <code className="text-purple-300">+📄</code> 或 <code className="text-yellow-300">+📁</code> 按鈕</li>
          <li><b>重新命名 / 刪除</b>：hover 任何節點 → 右側 ✏️ / 🗑️</li>
          <li><b>多 tab 編輯</b>：點檔案開 tab、tab X 關閉</li>
          <li><b>.py 內 import 其他 .py</b>：用 folder.module 形式、例 <code className="text-emerald-300">from utils.helper import greet</code></li>
          <li><b>.html + .css + .js 同層</b>：按執行 → iframe 把同層全部組起來渲染</li>
          <li><b>匯出 / 匯入</b>：右上工具列、整個 project tree dump 成 JSON</li>
          <li><b>autosave</b>：所有修改自動存 localStorage、重整還在</li>
        </ul>
      </div>
    </div>
  );
}
