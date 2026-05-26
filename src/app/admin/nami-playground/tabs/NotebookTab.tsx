"use client";

import { useState, useRef } from "react";
import { Play, Plus, Trash2, ChevronUp, ChevronDown, Loader2, Download } from "lucide-react";
import { usePyodide } from "@/hooks/usePyodide";
import { CodeEditor } from "@/components/ui/CodeEditor";

type Cell = {
  id: string;
  type: "code" | "markdown";
  source: string;
  output?: { stdout: string; stderr: string; result: string | null };
  running?: boolean;
};

const STARTER: Cell[] = [
  { id: crypto.randomUUID(), type: "markdown", source: "# 📓 Jupyter 風格 Notebook\n\n按 **Run cell** 跑這個 cell、變數會保留給下面用。" },
  { id: crypto.randomUUID(), type: "code", source: "x = 10\ny = 20\nprint(f'x + y = {x + y}')" },
  { id: crypto.randomUUID(), type: "code", source: "# 變數共享：x、y 從上面留下來\nprint(x * y)" },
  { id: crypto.randomUUID(), type: "markdown", source: "## 試試看\n- 改第二個 cell 的 `x` 值、再 Run\n- 上面 markdown 也可改、預覽會自動更新" },
];

function renderMarkdown(src: string): string {
  // 極簡 markdown 渲染（# / ## / list / bold / code）
  return src
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/^- (.*)$/gm, "<li>$1</li>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}

export function NotebookTab() {
  const { status, progress, error, load, run } = usePyodide();
  const [cells, setCells] = useState<Cell[]>(STARTER);

  const runCell = async (cellId: string) => {
    const cell = cells.find((c) => c.id === cellId);
    if (!cell || cell.type !== "code") return;
    setCells((prev) => prev.map((c) => (c.id === cellId ? { ...c, running: true } : c)));
    const r = await run(cell.source);
    setCells((prev) => prev.map((c) => (c.id === cellId ? { ...c, running: false, output: { stdout: r.stdout, stderr: r.stderr, result: r.result } } : c)));
  };

  const runAll = async () => {
    for (const c of cells) {
      if (c.type === "code") await runCell(c.id);
    }
  };

  const updateCell = (id: string, source: string) => {
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, source } : c)));
  };

  const addCell = (afterId: string, type: "code" | "markdown") => {
    setCells((prev) => {
      const idx = prev.findIndex((c) => c.id === afterId);
      const newCell: Cell = { id: crypto.randomUUID(), type, source: type === "markdown" ? "## 新 cell" : "# new cell\n" };
      return [...prev.slice(0, idx + 1), newCell, ...prev.slice(idx + 1)];
    });
  };

  const removeCell = (id: string) => setCells((p) => p.filter((c) => c.id !== id));

  const moveCell = (id: string, dir: -1 | 1) => {
    setCells((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const swap = idx + dir;
      if (swap < 0 || swap >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const setType = (id: string, type: "code" | "markdown") => {
    setCells((p) => p.map((c) => (c.id === id ? { ...c, type } : c)));
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 bg-bg-card border border-border rounded-2xl px-3 py-2 flex-wrap">
        {status === "idle" && (
          <button onClick={load} className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-900 dark:text-purple-100 border border-purple-500/40 text-xs inline-flex items-center gap-1">
            <Download size={11} /> 載入 Python
          </button>
        )}
        {status === "loading" && <span className="text-xs text-fg-muted inline-flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> {progress}</span>}
        {status === "ready" && <span className="text-xs text-emerald-400">● Python ready</span>}
        {status === "error" && <span className="text-xs text-red-400">⚠️ {error}</span>}
        <button onClick={runAll} disabled={status !== "ready"} className="ml-auto px-3 py-1 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold text-xs inline-flex items-center gap-1 disabled:opacity-50">
          <Play size={11} /> Run all cells
        </button>
      </div>

      {/* Cells */}
      <div className="space-y-2">
        {cells.map((cell, idx) => (
          <CellView
            key={cell.id}
            cell={cell}
            idx={idx}
            isFirst={idx === 0}
            isLast={idx === cells.length - 1}
            onRun={() => runCell(cell.id)}
            onUpdate={(s) => updateCell(cell.id, s)}
            onAddBelow={(type) => addCell(cell.id, type)}
            onRemove={() => removeCell(cell.id)}
            onMove={(dir) => moveCell(cell.id, dir)}
            onSetType={(t) => setType(cell.id, t)}
            disabled={status !== "ready"}
          />
        ))}
        {cells.length === 0 && (
          <button
            onClick={() => setCells([{ id: crypto.randomUUID(), type: "code", source: "" }])}
            className="w-full py-6 border-2 border-dashed border-border rounded-2xl text-fg-muted hover:border-accent hover:text-accent transition"
          >
            <Plus size={14} className="inline mr-1" /> 加第一個 cell
          </button>
        )}
      </div>
    </div>
  );
}

function CellView({
  cell, idx, isFirst, isLast, onRun, onUpdate, onAddBelow, onRemove, onMove, onSetType, disabled,
}: {
  cell: Cell;
  idx: number;
  isFirst: boolean;
  isLast: boolean;
  onRun: () => void;
  onUpdate: (s: string) => void;
  onAddBelow: (type: "code" | "markdown") => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onSetType: (t: "code" | "markdown") => void;
  disabled: boolean;
}) {
  return (
    <div className="group flex gap-2">
      {/* gutter */}
      <div className="w-12 flex flex-col items-center pt-2 text-[10px] text-fg-muted/60 font-mono">
        <span className={cell.type === "code" ? "text-cyan-400" : "text-pink-400"}>[{idx + 1}]</span>
        {cell.running && <Loader2 size={10} className="animate-spin mt-1 text-purple-400" />}
      </div>

      {/* body */}
      <div className="flex-1 bg-bg-card border border-border rounded-2xl overflow-hidden hover:border-purple-500/40 transition">
        {/* Cell header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-bg-elevated text-[10px]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSetType("code")}
              className={`px-2 py-0.5 rounded ${cell.type === "code" ? "bg-cyan-500/20 text-cyan-900 dark:text-cyan-100" : "text-fg-muted hover:text-fg"}`}
            >
              code
            </button>
            <button
              onClick={() => onSetType("markdown")}
              className={`px-2 py-0.5 rounded ${cell.type === "markdown" ? "bg-pink-500/20 text-pink-900 dark:text-pink-100" : "text-fg-muted hover:text-fg"}`}
            >
              markdown
            </button>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <button disabled={isFirst} onClick={() => onMove(-1)} className="p-1 text-fg-muted hover:text-fg disabled:opacity-30"><ChevronUp size={10} /></button>
            <button disabled={isLast} onClick={() => onMove(1)} className="p-1 text-fg-muted hover:text-fg disabled:opacity-30"><ChevronDown size={10} /></button>
            {cell.type === "code" && (
              <button onClick={onRun} disabled={disabled} className="px-2 py-0.5 rounded bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold inline-flex items-center gap-0.5 disabled:opacity-50">
                <Play size={9} /> run
              </button>
            )}
            <button onClick={() => onAddBelow("code")} className="text-fg-muted hover:text-cyan-400 px-1">+code</button>
            <button onClick={() => onAddBelow("markdown")} className="text-fg-muted hover:text-pink-400 px-1">+md</button>
            <button onClick={onRemove} className="p-1 text-fg-muted hover:text-red-400"><Trash2 size={10} /></button>
          </div>
        </div>

        {/* Editor */}
        {cell.type === "code" ? (
          <CodeEditor value={cell.source} onChange={onUpdate} onRun={onRun} lang="python" height="auto" minHeight="80px" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-border">
            <textarea
              value={cell.source}
              onChange={(e) => onUpdate(e.target.value)}
              className="w-full bg-bg font-mono text-xs p-3 outline-none border-0 resize-y min-h-[80px]"
              placeholder="markdown..."
            />
            <div className="p-3 text-sm prose prose-invert prose-sm max-w-none [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_li]:list-disc [&_li]:ml-4 [&_strong]:text-accent [&_code]:bg-bg-elevated [&_code]:px-1 [&_code]:rounded" dangerouslySetInnerHTML={{ __html: renderMarkdown(cell.source) }} />
          </div>
        )}

        {/* Output */}
        {cell.type === "code" && cell.output && (
          <div className="border-t border-border p-3 bg-[#0d1117] font-mono text-xs space-y-1">
            {cell.output.stdout && <pre className="whitespace-pre-wrap text-[#e6edf3]">{cell.output.stdout}</pre>}
            {cell.output.stderr && <pre className="whitespace-pre-wrap text-red-400">{cell.output.stderr}</pre>}
            {cell.output.result && !cell.output.stdout.includes(cell.output.result) && <pre className="text-cyan-400">=&gt; {cell.output.result}</pre>}
          </div>
        )}
      </div>
    </div>
  );
}
