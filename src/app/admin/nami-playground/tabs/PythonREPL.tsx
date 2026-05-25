"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Loader2, Trash2, BookOpen, Download } from "lucide-react";
import { usePyodide } from "@/hooks/usePyodide";

const EXAMPLES = [
  {
    label: "🐍 Hello Python",
    code: `# 基本 print + 變數
name = "Nami"
print(f"哈囉 {name}！")
print(2 + 2 * 3)`,
  },
  {
    label: "📊 List comprehension",
    code: `# 一行算前 20 個質數
import math
primes = [n for n in range(2, 100) if all(n % i for i in range(2, int(math.sqrt(n))+1))][:20]
print("前 20 個質數：", primes)`,
  },
  {
    label: "🧮 NumPy 矩陣 (要先 await loadPackage)",
    code: `# Pyodide 需要先載 numpy、第一次慢
import micropip
await micropip.install("numpy")
import numpy as np

arr = np.random.randn(3, 4)
print("矩陣：")
print(arr.round(2))
print("平均：", arr.mean().round(3))
print("標準差：", arr.std().round(3))`,
  },
  {
    label: "🐼 Pandas DataFrame",
    code: `import micropip
await micropip.install(["pandas"])
import pandas as pd

df = pd.DataFrame({
    "name": ["Alice", "Bob", "Charlie", "Dora"],
    "age":  [25, 32, 28, 45],
    "city": ["TPE", "KHH", "TPE", "TXG"],
})
print(df)
print("\\n按城市分組平均年齡：")
print(df.groupby("city")["age"].mean())`,
  },
  {
    label: "🎨 ASCII art",
    code: `# 印一座島
print(r'''
        🏝️
       /-_\\
      /-_-_\\
     /-_-_-_\\
~~~~~~~~~~~~~~~~~
   AI 島 學程式
~~~~~~~~~~~~~~~~~
''')`,
  },
];

export function PythonREPL() {
  const { status, progress, error, load, run } = usePyodide();
  const [code, setCode] = useState(EXAMPLES[0].code);
  const [output, setOutput] = useState<{ kind: "stdout" | "stderr" | "result" | "system"; text: string }[]>([]);
  const [running, setRunning] = useState(false);
  const outputRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
  }, [output]);

  const execute = async () => {
    if (running) return;
    setRunning(true);
    setOutput((p) => [...p, { kind: "system", text: `▶ ${new Date().toLocaleTimeString()} run` }]);
    const r = await run(code);
    if (r.stdout) setOutput((p) => [...p, { kind: "stdout", text: r.stdout }]);
    if (r.stderr) setOutput((p) => [...p, { kind: "stderr", text: r.stderr }]);
    if (r.result && !r.stdout.includes(r.result)) {
      setOutput((p) => [...p, { kind: "result", text: `=> ${r.result}` }]);
    }
    setRunning(false);
  };

  return (
    <div className="space-y-3">
      {/* Status */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {status === "idle" && (
          <button onClick={load} className="px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 inline-flex items-center gap-1">
            <Download size={11} /> 載入 Python runtime（首次 ~5MB）
          </button>
        )}
        {status === "loading" && (
          <span className="text-fg-muted inline-flex items-center gap-1">
            <Loader2 size={11} className="animate-spin" /> {progress || "載入中..."}
          </span>
        )}
        {status === "ready" && <span className="text-emerald-400 font-bold">● Python ready</span>}
        {status === "error" && <span className="text-red-400">⚠️ {error}</span>}
      </div>

      {/* Example dropdown */}
      <div className="flex items-center gap-2 flex-wrap">
        <BookOpen size={12} className="text-fg-muted" />
        <span className="text-xs text-fg-muted">範例：</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            onClick={() => setCode(ex.code)}
            className="text-[11px] px-2 py-1 rounded-full border border-border hover:border-purple-400 hover:text-purple-300 transition"
          >
            {ex.label}
          </button>
        ))}
      </div>

      {/* Editor + Output split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Editor */}
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-elevated">
            <span className="text-xs font-mono text-fg-muted">📝 編輯器</span>
            <button
              onClick={execute}
              disabled={running || status === "loading"}
              className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold text-xs inline-flex items-center gap-1 disabled:opacity-50"
            >
              {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
              Run
              <span className="text-[9px] ml-1 opacity-70">⌘↵</span>
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                execute();
              }
            }}
            spellCheck={false}
            className="flex-1 min-h-[300px] p-3 bg-[#0d1117] text-[#e6edf3] font-mono text-xs resize-none outline-none border-0 leading-relaxed"
            style={{ tabSize: 4 }}
            placeholder="# 在這寫 Python..."
          />
        </div>

        {/* Output */}
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-elevated">
            <span className="text-xs font-mono text-fg-muted">💬 輸出</span>
            <button
              onClick={() => setOutput([])}
              disabled={output.length === 0}
              className="text-[10px] text-fg-muted hover:text-red-400 inline-flex items-center gap-0.5 disabled:opacity-30"
            >
              <Trash2 size={10} /> clear
            </button>
          </div>
          <div ref={outputRef} className="flex-1 min-h-[300px] p-3 bg-[#0d1117] overflow-y-auto font-mono text-xs leading-relaxed">
            {output.length === 0 ? (
              <div className="text-fg-muted/60 text-[11px]">// 跑 Python 後輸出會顯示在這</div>
            ) : (
              output.map((line, i) => (
                <pre
                  key={i}
                  className={`whitespace-pre-wrap break-words ${
                    line.kind === "stderr" ? "text-red-400" :
                    line.kind === "result" ? "text-cyan-400" :
                    line.kind === "system" ? "text-fg-muted/60 text-[10px]" :
                    "text-[#e6edf3]"
                  }`}
                >
                  {line.text}
                </pre>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
