"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, Check, X } from "lucide-react";

const MODES = [
  { key: "outline", label: "產生大綱", hint: "輸入主題、AI 給文章大綱" },
  { key: "expand", label: "擴寫", hint: "把片段擴寫成完整段落" },
  { key: "polish", label: "潤稿", hint: "修順語句、保留原意" },
  { key: "rewrite", label: "改寫", hint: "換個說法表達" },
  { key: "summary", label: "產生摘要", hint: "濃縮成 2-3 句摘要" },
];

export function AiWriteHelper({
  onInsert,
}: {
  onInsert?: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("expand");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  const run = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setErr("");
    setOutput("");
    const res = await fetch("/api/blog/ai-write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, text: input.trim() }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setErr(json.message || json.error || "AI 生成失敗");
      return;
    }
    setOutput(json.result);
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 z-40 px-4 py-2.5 rounded-full bg-gradient-to-r from-accent to-accent-2 text-black font-bold text-sm shadow-xl hover:scale-105 transition flex items-center gap-1.5"
      >
        <Sparkles size={16} /> AI 寫作助手
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="font-bold flex items-center gap-1.5">
          <Sparkles size={16} className="text-accent" /> AI 寫作助手
        </div>
        <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-bg-elevated">
          <X size={16} />
        </button>
      </div>

      <div className="p-3 overflow-y-auto space-y-3">
        {/* 模式選擇 */}
        <div className="flex flex-wrap gap-1">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`text-xs px-2.5 py-1 rounded-full transition ${
                mode === m.key
                  ? "bg-accent text-black font-semibold"
                  : "bg-bg-elevated hover:bg-border"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-fg-muted">
          {MODES.find((m) => m.key === mode)?.hint}
        </p>

        {/* 輸入 */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === "outline" ? "輸入文章主題..." : "貼上要處理的文字..."}
          rows={4}
          className="w-full bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent resize-none"
        />
        <button
          onClick={run}
          disabled={!input.trim() || loading}
          className="w-full py-2 rounded-lg bg-accent text-black text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-1"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {loading ? "生成中..." : "開始"}
        </button>

        {err && <p className="text-xs text-red-400">{err}</p>}

        {/* 輸出 */}
        {output && (
          <div className="rounded-lg border border-border bg-bg p-2">
            <div className="text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">{output}</div>
            <div className="flex gap-2 mt-2 pt-2 border-t border-border">
              <button
                onClick={copy}
                className="flex-1 text-xs py-1.5 rounded bg-bg-elevated hover:bg-border flex items-center justify-center gap-1"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "已複製" : "複製"}
              </button>
              {onInsert && (
                <button
                  onClick={() => { onInsert(output); setOpen(false); }}
                  className="flex-1 text-xs py-1.5 rounded bg-accent text-black font-semibold"
                >
                  插入文章
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
