"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Send, Square, Sparkles } from "lucide-react";

type Msg = { role: "interviewer" | "candidate"; content: string };

const MODES = [
  { value: "tech",          label: "技術面試",        emoji: "💻" },
  { value: "behavior",      label: "行為面試",        emoji: "🗣️" },
  { value: "system-design", label: "系統設計",        emoji: "🏗️" },
  { value: "portfolio",     label: "作品集 review",   emoji: "🖼️" },
  { value: "case",          label: "Case Study",      emoji: "🧩" },
];

const ROLES = [
  // 工程
  { value: "frontend",  label: "前端工程師",    emoji: "🎨" },
  { value: "backend",   label: "後端工程師",    emoji: "⚙️" },
  { value: "fullstack", label: "全端工程師",    emoji: "🔧" },
  { value: "mobile",    label: "行動 App",       emoji: "📱" },
  { value: "ai",        label: "AI / ML",        emoji: "🤖" },
  { value: "data",      label: "資料工程",       emoji: "📊" },
  { value: "devops",    label: "DevOps / SRE",   emoji: "🛠️" },
  // 設計 / 產品
  { value: "designer",  label: "設計師 UI/UX",   emoji: "🎭" },
  { value: "pm",        label: "產品經理 PM",    emoji: "📋" },
  // 商業 / 創作
  { value: "marketing", label: "行銷 / 成長",    emoji: "📣" },
  { value: "content",   label: "內容創作",       emoji: "✍️" },
  // 創業 / 接案
  { value: "freelance", label: "接案 freelance", emoji: "💼" },
  { value: "indie",     label: "Indie Hacker",   emoji: "🚀" },
  { value: "founder",   label: "創業者 pitch",   emoji: "🦄" },
];

export function MockInterviewClient() {
  const [mode, setMode] = useState("tech");
  const [role, setRole] = useState("frontend");
  const [started, setStarted] = useState(false);
  const [history, setHistory] = useState<Msg[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<any | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, busy]);

  async function start() {
    setBusy(true);
    setHistory([]);
    setFeedback(null);
    setStarted(true);
    try {
      const r = await fetch("/api/me/mock-interview", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, role, action: "start", history: [] }),
      });
      const j = await r.json();
      if (j.question) setHistory([{ role: "interviewer", content: j.question }]);
      else setHistory([{ role: "interviewer", content: `❌ ${j.error ?? "啟動失敗"}` }]);
    } catch (e: any) {
      setHistory([{ role: "interviewer", content: `❌ ${e?.message}` }]);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!answer.trim() || busy) return;
    const newHistory = [...history, { role: "candidate" as const, content: answer.trim() }];
    setHistory(newHistory);
    setAnswer("");
    setBusy(true);
    try {
      const r = await fetch("/api/me/mock-interview", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, role, action: "answer", history: newHistory }),
      });
      const j = await r.json();
      if (j.question) setHistory([...newHistory, { role: "interviewer", content: j.question }]);
      else setHistory([...newHistory, { role: "interviewer", content: `❌ ${j.error ?? "失敗"}` }]);
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!history.length || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/me/mock-interview", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, role, action: "finish", history }),
      });
      const j = await r.json();
      setFeedback(j.feedback);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStarted(false);
    setHistory([]);
    setFeedback(null);
    setAnswer("");
  }

  if (!started) {
    return (
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <h3 className="font-bold text-lg mb-4">設定面試</h3>

        <label className="text-sm font-medium block mb-2">類型</label>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-4">
          {MODES.map((m) => (
            <button key={m.value} onClick={() => setMode(m.value)}
              className={`text-xs md:text-sm rounded-lg p-2.5 border transition ${mode === m.value ? "border-accent bg-accent/10 font-bold" : "border-border bg-bg-elevated hover:border-accent/40"}`}>
              <div className="text-lg mb-0.5">{m.emoji}</div>
              {m.label}
            </button>
          ))}
        </div>

        <label className="text-sm font-medium block mb-2">職位 / 行業</label>
        <div className="grid grid-cols-3 md:grid-cols-7 gap-2 mb-6">
          {ROLES.map((r) => (
            <button key={r.value} onClick={() => setRole(r.value)}
              className={`text-[11px] md:text-xs rounded-lg p-2 border transition ${role === r.value ? "border-accent bg-accent/10 font-bold" : "border-border bg-bg-elevated hover:border-accent/40"}`}>
              <div className="text-lg mb-0.5">{r.emoji}</div>
              {r.label}
            </button>
          ))}
        </div>

        <button onClick={start} disabled={busy} className="btn-chip btn-chip-success w-full justify-center py-3 text-sm font-bold disabled:opacity-50">
          {busy ? <><Loader2 size={14} className="animate-spin" /> 雪鑰準備中...</> : <><Sparkles size={14} /> 🎤 開始面試</>}
        </button>
      </div>
    );
  }

  if (feedback) {
    return (
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <h3 className="font-bold text-xl mb-4 flex items-center gap-2">📊 面試評分</h3>

        {feedback.overall_score !== undefined && (
          <div className="text-center mb-6 p-6 bg-bg-elevated rounded-xl">
            <div className="text-5xl font-extrabold text-accent">{feedback.overall_score}</div>
            <div className="text-xs text-fg-muted mt-1">總分 / 100</div>
          </div>
        )}

        {feedback.comment && (
          <blockquote className="border-l-2 border-accent-2 pl-3 italic text-sm mb-5">
            💬 {feedback.comment}
          </blockquote>
        )}

        {Array.isArray(feedback.breakdown) && (
          <div className="space-y-2 mb-5">
            {feedback.breakdown.map((b: any, i: number) => (
              <div key={i} className="bg-bg-elevated rounded p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-sm">{b.aspect}</span>
                  <span className="text-sm font-bold">{b.score}</span>
                </div>
                <div className="h-1.5 bg-bg rounded overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${b.score}%` }} />
                </div>
                {b.note && <p className="text-xs text-fg-muted mt-1.5">{b.note}</p>}
              </div>
            ))}
          </div>
        )}

        {Array.isArray(feedback.next_steps) && (
          <div className="mb-5">
            <h4 className="font-bold mb-2">📝 下一步</h4>
            <ul className="space-y-1.5">
              {feedback.next_steps.map((s: string, i: number) => (
                <li key={i} className="bg-bg-elevated rounded p-2.5 text-sm">{s}</li>
              ))}
            </ul>
          </div>
        )}

        {feedback.raw && (
          <pre className="text-xs bg-bg-elevated rounded p-3 mb-4 overflow-auto">{feedback.raw}</pre>
        )}

        <div className="flex gap-2">
          <button onClick={reset} className="btn-chip btn-chip-info flex-1 justify-center py-2.5">
            再面一場
          </button>
          <a href="/me/mock-interview/history" className="btn-chip btn-chip-neutral py-2.5">
            📋 看歷史
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-border rounded-xl flex flex-col h-[70vh] overflow-hidden">
      <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="chip chip-info">{MODES.find((m) => m.value === mode)?.label}</span>
          <span className="chip chip-neutral">{ROLES.find((r) => r.value === role)?.label}</span>
        </div>
        <button onClick={finish} disabled={busy || history.length < 2} className="btn-chip btn-chip-warn text-xs disabled:opacity-50">
          <Square size={12} /> 結束面試
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {history.map((m, i) => (
          <div key={i} className={`flex ${m.role === "candidate" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${m.role === "candidate" ? "bg-accent/15 border border-accent/30" : "bg-bg-elevated border border-border"}`}>
              <div className="text-[10px] text-fg-muted mb-1 font-medium">
                {m.role === "candidate" ? "🧑 你" : "🎤 雪鑰面試官"}
              </div>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-bg-elevated border border-border rounded-2xl p-3 text-sm flex items-center gap-2 text-fg-muted">
              <Loader2 size={14} className="animate-spin" /> 雪鑰思考中...
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }}
            placeholder="輸入你的回答... (Ctrl/Cmd + Enter 送出)"
            rows={3}
            disabled={busy}
            className="flex-1 bg-bg-elevated border border-border rounded-lg p-2.5 text-sm resize-none outline-none focus:border-accent disabled:opacity-50"
          />
          <button onClick={submit} disabled={busy || !answer.trim()} className="btn-chip btn-chip-success self-end disabled:opacity-50">
            <Send size={14} /> 送
          </button>
        </div>
      </div>
    </div>
  );
}
