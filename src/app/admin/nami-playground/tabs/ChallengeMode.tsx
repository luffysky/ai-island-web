"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Loader2, Play, CheckCircle2, XCircle, ChevronDown, ChevronRight, Lightbulb, Lock, Sparkles, Zap, Award } from "lucide-react";
import { usePyodide } from "@/hooks/usePyodide";
import { CodeEditor, loadEditorValue } from "@/components/ui/CodeEditor";
import { AskAI } from "@/components/nami/AskAI";
import { ChallengeGenerator } from "./ChallengeGenerator";

type Challenge = {
  id: string;
  level: "easy" | "medium" | "hard";
  category: string;
  title: string;
  scenario: string;
  task: string;
  starter_code: string;
  test_code: string;
  hints: string[];
  solution: string | null;
  solution_explain: string[];
  xp_award: number;
};

type Progress = {
  challenge_id: string;
  status: "pending" | "attempted" | "passed";
  attempts: number;
  best_code?: string;
  hints_revealed: number;
  passed_at: string | null;
};

const LEVEL_META = {
  easy:   { label: "🟢 入門", color: "bg-emerald-500/10 border-emerald-500/40 text-emerald-300" },
  medium: { label: "🟡 進階", color: "bg-yellow-500/10 border-yellow-500/40 text-yellow-300" },
  hard:   { label: "🔴 業界", color: "bg-red-500/10 border-red-500/40 text-red-300" },
};

export function ChallengeMode() {
  const { status, progress: pyProgress, error, load, run } = usePyodide();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, Progress>>({});
  const [selected, setSelected] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ passed: boolean; msg: string; xp?: number; firstPass?: boolean } | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [filterLevel, setFilterLevel] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [loadingList, setLoadingList] = useState(true);

  const refresh = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        fetch("/api/admin/playground/challenges"),
        fetch("/api/admin/playground/challenges/progress"),
      ]);
      const c = await cRes.json();
      const p = await pRes.json();
      setChallenges(c.challenges ?? []);
      const map: Record<string, Progress> = {};
      for (const pp of (p.progress ?? []) as Progress[]) map[pp.challenge_id] = pp;
      setProgressMap(map);
      if (c.challenges?.length && !selected) {
        pick(c.challenges[0], map);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const pick = (ch: Challenge, map?: Record<string, Progress>) => {
    setSelected(ch);
    const savedCode = loadEditorValue(`challenge-${ch.id}`, "");
    const prog = (map ?? progressMap)[ch.id];
    setCode(savedCode || prog?.best_code || ch.starter_code);
    setOutput("");
    setResult(null);
    setShowHints(false);
    setShowSolution(prog?.status === "passed");
  };

  const submit = async () => {
    if (!selected || running) return;
    setRunning(true);
    setOutput("");
    setImages([]);
    setResult(null);
    // 在 Pyodide 跑 user code + test code
    const combined = `${code}\n\n# === 測試 (你看不到、由系統評分) ===\n${selected.test_code}`;
    const r = await run(combined);
    setOutput(r.stdout);
    setImages(r.images);
    const passed = !r.stderr && r.ok;
    // 寫 server
    try {
      const res = await fetch("/api/admin/playground/challenge/submit", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: selected.id, code, passed, error: r.stderr }),
      });
      const j = await res.json();
      setResult({
        passed,
        msg: passed
          ? (j.first_pass ? `🎉 通過！第一次破關、+${j.xp_awarded} XP` : `✅ 再次通過`)
          : `❌ 沒過：${r.stderr.split("\n").pop() || "看 output"}`,
        xp: j.xp_awarded,
        firstPass: j.first_pass,
      });
      if (passed) {
        // 更新 progress map
        setProgressMap((prev) => ({
          ...prev,
          [selected.id]: {
            challenge_id: selected.id,
            status: "passed",
            attempts: (prev[selected.id]?.attempts ?? 0) + 1,
            hints_revealed: prev[selected.id]?.hints_revealed ?? 0,
            passed_at: new Date().toISOString(),
            best_code: code,
          },
        }));
        setShowSolution(true);
      } else {
        setProgressMap((prev) => ({
          ...prev,
          [selected.id]: {
            challenge_id: selected.id,
            status: "attempted",
            attempts: (prev[selected.id]?.attempts ?? 0) + 1,
            hints_revealed: prev[selected.id]?.hints_revealed ?? 0,
            passed_at: prev[selected.id]?.passed_at ?? null,
            best_code: prev[selected.id]?.best_code,
          },
        }));
      }
    } catch (e: any) {
      setResult({ passed: false, msg: `提交失敗: ${e?.message}` });
    } finally {
      setRunning(false);
    }
  };

  const filtered = filterLevel === "all" ? challenges : challenges.filter((c) => c.level === filterLevel);
  const passedCount = Object.values(progressMap).filter((p) => p.status === "passed").length;
  const totalXp = challenges.filter((c) => progressMap[c.id]?.status === "passed").reduce((s, c) => s + c.xp_award, 0);

  if (loadingList) return <div className="text-center py-8 text-fg-muted"><Loader2 className="animate-spin inline mr-2" size={14} />載入挑戰...</div>;
  if (challenges.length === 0) return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
      <div className="font-bold mb-2">⚠️ 還沒任何挑戰</div>
      <code className="block bg-bg p-3 rounded text-xs">supabase/nami_challenges_migration.sql 跑了嗎？</code>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-yellow-500/10 border border-purple-500/30 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
        <Trophy className="text-yellow-400" size={28} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">挑戰進度</div>
          <div className="text-xs text-fg-muted">{passedCount} / {challenges.length} 已通過 · 累積 {totalXp} XP</div>
        </div>
        <div className="flex gap-2 text-xs flex-wrap items-center">
          {(["all", "easy", "medium", "hard"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setFilterLevel(l)}
              className={`px-2.5 py-1 rounded-full border ${filterLevel === l ? "bg-purple-500/20 border-purple-400 text-purple-300" : "border-border text-fg-muted"}`}
            >
              {l === "all" ? "全部" : LEVEL_META[l].label}
            </button>
          ))}
          <ChallengeGenerator onInserted={refresh} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* List */}
        <div className="lg:col-span-1 bg-bg-card border border-border rounded-2xl p-2 max-h-[600px] overflow-y-auto">
          <h3 className="text-xs font-bold text-fg-muted px-2 py-1.5 sticky top-0 bg-bg-card">📋 題目</h3>
          {filtered.map((ch) => {
            const prog = progressMap[ch.id];
            const meta = LEVEL_META[ch.level];
            const isPassed = prog?.status === "passed";
            const isActive = selected?.id === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => pick(ch)}
                className={`w-full text-left p-2 rounded-lg mb-1 transition border ${
                  isActive
                    ? "border-purple-400 bg-purple-500/10"
                    : "border-transparent hover:bg-bg-elevated"
                }`}
              >
                <div className="flex items-start gap-1.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${meta.color} flex-shrink-0`}>{meta.label}</span>
                  {isPassed && <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0 mt-0.5" />}
                </div>
                <div className="text-xs font-bold mt-1 line-clamp-2">{ch.title}</div>
                <div className="text-[9px] text-fg-muted mt-0.5">+{ch.xp_award} XP</div>
              </button>
            );
          })}
        </div>

        {/* Detail + Editor */}
        {selected && (
          <div className="lg:col-span-3 space-y-3">
            {/* Title + scenario */}
            <div className="bg-bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${LEVEL_META[selected.level].color}`}>{LEVEL_META[selected.level].label}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-elevated text-fg-muted">{selected.category}</span>
                <h2 className="font-extrabold text-lg">{selected.title}</h2>
                <span className="ml-auto text-xs text-yellow-400 inline-flex items-center gap-1"><Zap size={11} />+{selected.xp_award} XP</span>
                {progressMap[selected.id]?.status === "passed" && (
                  <span className="text-xs text-emerald-400 inline-flex items-center gap-1"><Award size={11} /> 已通過</span>
                )}
              </div>
              <p className="text-sm text-fg-muted leading-relaxed">{selected.scenario}</p>
              <p className="text-sm mt-2 leading-relaxed bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                <b className="text-purple-300">要做：</b>
                <span className="whitespace-pre-wrap">{selected.task}</span>
              </p>
              {progressMap[selected.id]?.attempts > 0 && (
                <div className="text-[10px] text-fg-muted mt-2">已嘗試 {progressMap[selected.id].attempts} 次</div>
              )}
            </div>

            {/* Hints */}
            <details className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl" open={showHints}>
              <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-yellow-300 inline-flex items-center gap-1.5">
                <Lightbulb size={12} /> 提示 ({selected.hints.length}) {!showHints && <Lock size={10} className="opacity-50" />}
              </summary>
              <div className="px-3 pb-3 space-y-1 text-xs text-fg-muted">
                {selected.hints.map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-yellow-400 font-bold">{i + 1}.</span>
                    <span dangerouslySetInnerHTML={{ __html: h.replace(/`([^`]+)`/g, '<code class="bg-bg px-1 rounded text-yellow-200 text-[10px]">$1</code>') }} />
                  </div>
                ))}
              </div>
            </details>

            {/* Status + Submit */}
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <div>
                {status === "ready" && <span className="text-emerald-400">● Python ready</span>}
                {status === "loading" && <span className="text-fg-muted inline-flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> {pyProgress}</span>}
                {status === "idle" && <button onClick={load} className="px-2 py-1 rounded-full bg-purple-500/20 border border-purple-500/40">載入 Python</button>}
              </div>
              <div className="flex items-center gap-2">
                <AskAI code={code} error={output} lang="python" context={`挑戰 · ${selected.title}`} />
                <button
                  onClick={submit}
                  disabled={running || status !== "ready"}
                  className="px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold text-xs inline-flex items-center gap-1 disabled:opacity-50"
                >
                  {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                  提交挑戰
                  <span className="text-[9px] opacity-70 ml-1">⌘↵</span>
                </button>
              </div>
            </div>

            {/* Editor + result */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">📝 你的解</div>
                <CodeEditor value={code} onChange={setCode} onRun={submit} lang="python" storageKey={`challenge-${selected.id}`} height="380px" minHeight="380px" />
              </div>
              <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
                <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">🎯 評分結果</div>
                <div className="flex-1 min-h-[380px] p-3 bg-[#0d1117] overflow-y-auto font-mono text-xs">
                  {result && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`mb-3 rounded-lg p-3 ${result.passed ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-300" : "bg-red-500/10 border border-red-500/40 text-red-300"}`}
                    >
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        {result.passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {result.passed ? "PASS" : "FAIL"}
                      </div>
                      <div className="text-xs">{result.msg}</div>
                      {result.firstPass && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-2 inline-block px-3 py-1 rounded-full bg-yellow-400 text-black font-extrabold">
                          <Sparkles size={11} className="inline" /> +{result.xp} XP！
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                  {output && <pre className="whitespace-pre-wrap text-[#e6edf3]">{output}</pre>}
                  {images.map((b64, i) => (
                    <div key={i} className="my-2 bg-[#0d1117] rounded">
                      <img src={`data:image/png;base64,${b64}`} alt={`output-${i}`} className="max-w-full rounded" />
                    </div>
                  ))}
                  {!output && !result && images.length === 0 && <span className="text-fg-muted/60">// 寫完點「提交挑戰」、跑 user code + 隱藏 test、看 PASS / FAIL</span>}
                </div>
              </div>
            </div>

            {/* Solution (passed 後可看) */}
            {selected.solution && (
              <details className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl" open={showSolution}>
                <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-emerald-300 inline-flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> {progressMap[selected.id]?.status === "passed" ? "✅ 完整解答 (你已通過)" : "🔒 完整解答 (通過後可看)"}
                </summary>
                {progressMap[selected.id]?.status === "passed" || showSolution ? (
                  <div className="px-3 pb-3 space-y-2">
                    <pre className="bg-[#0d1117] text-[#e6edf3] font-mono text-[11px] p-3 rounded-lg overflow-x-auto whitespace-pre">
                      {selected.solution}
                    </pre>
                    {selected.solution_explain.length > 0 && (
                      <div className="text-xs text-fg-muted space-y-1 pl-3 border-l-2 border-emerald-500/30">
                        {selected.solution_explain.map((line, i) => (
                          <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/`([^`]+)`/g, '<code class="bg-bg px-1 rounded text-emerald-300">$1</code>') }} />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-3 pb-3 text-xs text-fg-muted">先試自己寫看看！</div>
                )}
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
