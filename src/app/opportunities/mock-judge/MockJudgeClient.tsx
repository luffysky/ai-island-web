"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gavel, Send, Loader2, Trophy, RotateCcw } from "lucide-react";

type Msg = { role: "judge" | "user"; content: string };
type Verdict = { score: number; strengths: string[]; weaknesses: string[]; advice: string[]; judge: string };

const PERSONAS = [
  { key: "investor", emoji: "🧑‍💼", label: "投資人" },
  { key: "tech", emoji: "👨‍💻", label: "技術評審" },
  { key: "business", emoji: "👩‍💼", label: "商業評審" },
  { key: "user", emoji: "🙋", label: "使用者" },
  { key: "troll", emoji: "😈", label: "酸民模式" },
];

export function MockJudgeClient() {
  const [about, setAbout] = useState("");
  const [persona, setPersona] = useState("investor");
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  const ask = async (msgs: Msg[]) => {
    setLoading(true);
    try {
      const r = await fetch("/api/opportunities/mock-judge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ about: about.trim(), persona, messages: msgs }) });
      const d = await r.json();
      if (d.error) { alert(d.error); return; }
      if (d.type === "verdict") setVerdict(d);
      else setMessages([...msgs, { role: "judge", content: d.text }]);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const start = () => { if (!about.trim()) return; setStarted(true); setMessages([]); setVerdict(null); ask([]); };
  const answer = () => {
    if (!input.trim() || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: input.trim() }];
    setMessages(next); setInput(""); ask(next);
  };
  const reset = () => { setStarted(false); setMessages([]); setVerdict(null); setInput(""); };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <Link href="/opportunities" className="inline-flex items-center gap-1 text-sm text-black/50 dark:text-white/50 hover:text-violet-600 dark:hover:text-violet-400 mb-4">
        <ArrowLeft className="w-4 h-4" /> 機會島
      </Link>
      <h1 className="text-2xl font-bold flex items-center gap-2"><Gavel className="w-6 h-6 text-violet-500" /> AI 模擬評審</h1>
      <p className="text-sm text-black/60 dark:text-white/60 mt-1">貼上你的作品/簡報，AI 評審會像決賽 Q&A 一樣犀利追問，最後給你評分與準備建議。練膽、找盲點。</p>

      {!started ? (
        <div className="mt-5 space-y-4">
          <div>
            <div className="text-sm font-semibold mb-2">選一位評審</div>
            <div className="flex flex-wrap gap-1.5">
              {PERSONAS.map((p) => (
                <button key={p.key} onClick={() => setPersona(p.key)} className={`text-sm rounded-full px-3 py-1.5 border ${persona === p.key ? "bg-violet-600 border-violet-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10"}`}>{p.emoji} {p.label}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold mb-2">你的作品 / 簡報內容</div>
            <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={6}
              placeholder="用幾句話介紹你的產品：解決誰的什麼問題、怎麼做、目前進度、商業模式…（越具體，評審問得越到位）"
              className="w-full bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/15 rounded-xl p-3 text-sm outline-none focus:border-violet-500 resize-none" />
          </div>
          <button onClick={start} disabled={!about.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-4 py-2 text-sm font-medium">
            <Gavel className="w-4 h-4" /> 開始面試
          </button>
        </div>
      ) : (
        <div className="mt-5">
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === "user" ? "bg-violet-600 text-white" : "bg-black/5 dark:bg-white/10"}`}>
                  {m.role === "judge" && <div className="text-[10px] opacity-60 mb-0.5">{PERSONAS.find((p) => p.key === persona)?.label}</div>}
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                </div>
              </div>
            ))}
            {loading && <div className="flex justify-start"><div className="rounded-2xl px-3.5 py-2.5 bg-black/5 dark:bg-white/10"><Loader2 className="w-4 h-4 animate-spin" /></div></div>}
          </div>

          {verdict ? (
            <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2 mb-2"><Trophy className="w-5 h-5 text-amber-500" /><span className="font-bold">評分：{verdict.score} / 100</span></div>
              {verdict.strengths?.length > 0 && <div className="mt-2"><div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">👍 優點</div><ul className="text-sm mt-1 space-y-0.5 list-disc pl-5">{verdict.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
              {verdict.weaknesses?.length > 0 && <div className="mt-2"><div className="text-xs font-semibold text-rose-600 dark:text-rose-400">⚠️ 弱點</div><ul className="text-sm mt-1 space-y-0.5 list-disc pl-5">{verdict.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
              {verdict.advice?.length > 0 && <div className="mt-2"><div className="text-xs font-semibold text-violet-600 dark:text-violet-400">💡 準備建議</div><ul className="text-sm mt-1 space-y-0.5 list-disc pl-5">{verdict.advice.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
              <button onClick={reset} className="inline-flex items-center gap-1.5 mt-3 rounded-xl border border-black/10 dark:border-white/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"><RotateCcw className="w-4 h-4" /> 再練一次</button>
            </div>
          ) : (
            <div className="mt-4 flex items-end gap-2">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={2}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) answer(); }}
                placeholder="回答評審…（Ctrl/⌘ + Enter 送出）" disabled={loading}
                className="flex-1 bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/15 rounded-xl p-2.5 text-sm outline-none focus:border-violet-500 resize-none" />
              <button onClick={answer} disabled={!input.trim() || loading} className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-3.5 py-2 text-sm font-medium"><Send className="w-4 h-4" /> 回答</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
