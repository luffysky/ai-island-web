"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { TerminalSquare, Trash2, RotateCcw, Loader2, ChevronDown } from "lucide-react";
import { usePyodide } from "@/hooks/usePyodide";

/**
 * 虛擬終端機 — 學員可以「真的打指令、看結果」。兩種模式：
 *
 *  • Python REPL（mode="python"）：走瀏覽器內 Pyodide worker、**namespace 持久**
 *    （變數/函式跨指令保留）→ 真正的互動式 REPL，零後端、立即可用。
 *
 *  • Shell（mode="shell"）：走 /api/playground/run（bash via Piston）。
 *    Piston 是「無狀態單次執行」、所以用 **session replay**：每次把先前成功的指令 +
 *    這次指令一起送、只顯示新增的輸出 → cd / 變數 等狀態得以延續。
 *    （需 admin 設好自架 PISTON_BASE_URL；公開 Piston 已白名單化會回提示。）
 */

type Line = { kind: "in" | "out" | "err" | "info"; text: string };

const PROMPT: Record<"python" | "shell", string> = { python: ">>>", shell: "$" };

export function VirtualTerminal({
  defaultMode = "python",
  className = "",
}: {
  defaultMode?: "python" | "shell";
  className?: string;
}) {
  const [mode, setMode] = useState<"python" | "shell">(defaultMode);
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);

  // shell session replay 狀態
  const committedRef = useRef<string[]>([]); // 先前成功執行的指令
  const lastStdoutRef = useRef<string>("");  // 先前累計 stdout（用來 slice 出新輸出）

  const pyodide = usePyodide(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines, busy]);

  const append = useCallback((ls: Line[]) => setLines((prev) => [...prev, ...ls]), []);

  const resetSession = useCallback(async () => {
    committedRef.current = [];
    lastStdoutRef.current = "";
    setLines([]);
    setHistIdx(-1);
    if (mode === "python") {
      try { await pyodide.reset(); } catch {}
      append([{ kind: "info", text: "Python 環境已重置（變數清空）。" }]);
    } else {
      append([{ kind: "info", text: "Shell session 已重置。" }]);
    }
  }, [mode, pyodide, append]);

  // 切換模式 → 清空、重置 session
  const switchMode = (m: "python" | "shell") => {
    if (m === mode) return;
    committedRef.current = [];
    lastStdoutRef.current = "";
    setLines([]);
    setHistIdx(-1);
    setMode(m);
  };

  const runPython = async (cmd: string) => {
    if (pyodide.status !== "ready") {
      append([{ kind: "info", text: "首次載入 Python 環境（約 5–15 秒）…" }]);
      const ok = await pyodide.load();
      if (!ok) { append([{ kind: "err", text: "Python 環境載入失敗、請重試。" }]); return; }
    }
    const r = await pyodide.run(cmd);
    const out: Line[] = [];
    if (r.stdout) out.push({ kind: "out", text: r.stdout.replace(/\n$/, "") });
    if (r.stderr) out.push({ kind: "err", text: r.stderr.replace(/\n$/, "") });
    // REPL：最後一個運算式的值（像在 python shell 打 2+2 會印 4）
    if (r.ok && r.result != null && r.result !== "None" && r.result !== "") {
      out.push({ kind: "out", text: r.result });
    }
    if (out.length === 0 && r.ok) out.push({ kind: "info", text: "(無輸出)" });
    append(out);
  };

  const runShell = async (cmd: string) => {
    // session replay：先前指令 + 這次
    const script = [...committedRef.current, cmd].join("\n");
    try {
      const res = await fetch("/api/playground/run", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "bash", code: script }),
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        if (res.status === 401) { append([{ kind: "err", text: "請先登入才能用終端機。" }]); return; }
        append([{ kind: "err", text: `服務異常（HTTP ${res.status}）。` }]); return;
      }
      const data = await res.json();
      if (data.error) {
        // 多半是 Piston 未設定 / 白名單（503 piston_whitelisted）
        append([{ kind: "err", text: `❌ ${data.error}` }]);
        return;
      }
      const fullStdout: string = data.stdout ?? "";
      const fullStderr: string = data.stderr ?? "";
      const newOut = fullStdout.startsWith(lastStdoutRef.current)
        ? fullStdout.slice(lastStdoutRef.current.length)
        : fullStdout; // replay 對不上就顯示全部（保險）
      const ok = data.exitCode === 0 || data.exitCode == null;
      const out: Line[] = [];
      if (newOut.trim()) out.push({ kind: "out", text: newOut.replace(/\n$/, "") });
      if (fullStderr.trim()) out.push({ kind: "err", text: fullStderr.replace(/\n$/, "") });
      if (out.length === 0) out.push({ kind: "info", text: "(無輸出)" });
      append(out);
      // 只有成功才把指令納入 session（避免壞指令污染）
      if (ok) { committedRef.current.push(cmd); lastStdoutRef.current = fullStdout; }
    } catch (e: any) {
      append([{ kind: "err", text: `❌ ${e?.message ?? "執行失敗"}` }]);
    }
  };

  const submit = async () => {
    const cmd = input.replace(/\s+$/, "");
    if (!cmd.trim() || busy) return;
    append([{ kind: "in", text: cmd }]);
    setHistory((h) => [...h, cmd]);
    setHistIdx(-1);
    setInput("");
    setBusy(true);
    try {
      if (mode === "python") await runPython(cmd);
      else await runShell(cmd);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === "ArrowUp" && !input.includes("\n")) {
      // 叫回上一條指令
      if (history.length === 0) return;
      e.preventDefault();
      const idx = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(idx);
      setInput(history[idx]);
    } else if (e.key === "ArrowDown" && histIdx >= 0) {
      e.preventDefault();
      const idx = histIdx + 1;
      if (idx >= history.length) { setHistIdx(-1); setInput(""); }
      else { setHistIdx(idx); setInput(history[idx]); }
    }
  };

  const prompt = PROMPT[mode];

  return (
    <div className={`rounded-xl border border-emerald-500/25 bg-[#0c1512] overflow-hidden ${className}`}>
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-emerald-500/20 bg-[#08100d]">
        <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-300">
          <TerminalSquare size={13} /> 虛擬終端機
        </span>
        <div className="flex items-center gap-1">
          {/* 模式切換 */}
          <div className="flex rounded-md overflow-hidden border border-emerald-500/30 text-[11px] mr-1">
            <button
              onClick={() => switchMode("python")}
              className={`px-2 py-0.5 ${mode === "python" ? "bg-emerald-500/30 text-emerald-100" : "text-emerald-400/70 hover:bg-white/5"}`}
            >🐍 Python</button>
            <button
              onClick={() => switchMode("shell")}
              className={`px-2 py-0.5 ${mode === "shell" ? "bg-emerald-500/30 text-emerald-100" : "text-emerald-400/70 hover:bg-white/5"}`}
            >$ Shell</button>
          </div>
          <button onClick={() => setLines([])} title="清畫面" className="p-1 rounded hover:bg-white/10 text-emerald-300/80">
            <Trash2 size={13} />
          </button>
          <button onClick={resetSession} title="重置環境（清變數/session）" className="p-1 rounded hover:bg-white/10 text-emerald-300/80">
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* 輸出區 */}
      <div
        ref={scrollRef}
        onClick={() => inputRef.current?.focus()}
        className="px-3 py-2 font-mono text-[12.5px] leading-relaxed overflow-y-auto overflow-x-auto cursor-text"
        style={{ maxHeight: 280, minHeight: 140, WebkitOverflowScrolling: "touch" }}
      >
        {lines.length === 0 && (
          <div className="text-emerald-400/40">
            {mode === "python"
              ? "互動式 Python：打指令按 Enter（Shift+Enter 換行）。變數會保留，例如先 x = 5、再打 x + 1。"
              : "Shell：打指令按 Enter。例如 echo hello、ls、pwd、python3 -c 'print(1+1)'。（雲端沙盒執行、cd/變數會在這個 session 內延續）"}
          </div>
        )}
        {lines.map((l, i) => (
          <pre key={i} className={`whitespace-pre-wrap break-words m-0 ${
            l.kind === "in" ? "text-emerald-200" :
            l.kind === "err" ? "text-red-300" :
            l.kind === "info" ? "text-emerald-400/50" : "text-gray-100"
          }`}>
            {l.kind === "in" ? `${prompt} ${l.text}` : l.text}
          </pre>
        ))}
        {busy && (
          <div className="flex items-center gap-1.5 text-emerald-400/70 text-xs mt-1">
            <Loader2 size={12} className="animate-spin" /> 執行中…
          </div>
        )}
      </div>

      {/* 輸入列 */}
      <div className="flex items-end gap-2 px-3 py-2 border-t border-emerald-500/20 bg-[#0a120f]">
        <span className="text-emerald-400 font-mono text-[12.5px] pb-1.5 select-none">{prompt}</span>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          disabled={busy}
          placeholder={busy ? "" : "輸入指令、Enter 執行"}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="flex-1 bg-transparent text-emerald-50 font-mono text-[12.5px] outline-none resize-none placeholder:text-emerald-400/30 py-1"
          style={{ maxHeight: 96 }}
        />
        <button
          onClick={submit}
          disabled={busy || !input.trim()}
          className="shrink-0 mb-0.5 px-3 py-1 rounded-md bg-emerald-500/80 text-black text-xs font-bold hover:bg-emerald-400 transition disabled:opacity-40"
        >執行</button>
      </div>
    </div>
  );
}
