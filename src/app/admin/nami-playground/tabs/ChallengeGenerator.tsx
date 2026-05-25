"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Plus, X, Check, Wand2, ChevronDown, ChevronRight } from "lucide-react";

type GenChallenge = {
  tempId: string;
  level: "easy" | "medium" | "hard";
  category: string;
  title: string;
  scenario: string;
  task: string;
  starter_code: string;
  test_code: string;
  hints: string[];
  solution: string;
  solution_explain: string[];
  xp_award: number;
};

const LEVEL_META = {
  easy:   { label: "🟢 入門", color: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10" },
  medium: { label: "🟡 進階", color: "border-yellow-500/40 text-yellow-300 bg-yellow-500/10" },
  hard:   { label: "🔴 業界", color: "border-red-500/40 text-red-300 bg-red-500/10" },
};

const CATEGORIES = ["basic", "pandas", "scrape", "fastapi", "web", "data", "algorithm"];

export function ChallengeGenerator({ onInserted }: { onInserted: () => void }) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<"easy" | "medium" | "hard">("easy");
  const [count, setCount] = useState(3);
  const [category, setCategory] = useState("basic");
  const [hint, setHint] = useState("");
  const [generated, setGenerated] = useState<GenChallenge[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inserting, setInserting] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const reset = () => {
    setGenerated([]);
    setSelected(new Set());
    setError("");
  };

  const generate = async () => {
    setLoading(true);
    setError("");
    reset();
    try {
      const res = await fetch("/api/admin/playground/challenge/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, count, category, hint }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || j.message || "出題失敗");
      setGenerated(j.challenges ?? []);
      // 預設全勾
      setSelected(new Set((j.challenges ?? []).map((c: GenChallenge) => c.tempId)));
    } catch (e: any) {
      setError(e?.message ?? "失敗");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === generated.length) setSelected(new Set());
    else setSelected(new Set(generated.map((c) => c.tempId)));
  };

  const insertSelected = async () => {
    const toInsert = generated.filter((c) => selected.has(c.tempId));
    if (toInsert.length === 0) {
      alert("選 0 題、要勾才能加");
      return;
    }
    setInserting(true);
    try {
      const res = await fetch("/api/admin/playground/challenge/bulk-insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenges: toInsert }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "失敗");
      alert(`✅ 已加入 ${j.inserted} 題！\nIDs: ${j.ids.join(", ")}`);
      reset();
      setOpen(false);
      onInserted();
    } catch (e: any) {
      alert(`❌ 加入失敗：${e?.message}`);
    } finally {
      setInserting(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 text-black font-bold text-xs inline-flex items-center gap-1 hover:scale-105 transition shadow-lg shadow-pink-500/20"
      >
        <Wand2 size={12} /> 幫我出題
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !loading && !inserting && setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="bg-bg-card border border-pink-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-pink-500/20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-yellow-500/10 via-pink-500/10 to-purple-500/10 px-4 py-3 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-yellow-400" />
                  <span className="font-bold">AI 出題機</span>
                  {generated.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300">
                      已生 {generated.length} 題、選 {selected.size}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => !loading && !inserting && setOpen(false)}
                  disabled={loading || inserting}
                  className="p-1 text-fg-muted hover:text-fg disabled:opacity-30"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Config */}
              {generated.length === 0 && (
                <div className="p-5 space-y-3 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-2">
                    {(["easy", "medium", "hard"] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => setLevel(l)}
                        className={`px-3 py-2 rounded-xl border text-sm font-bold transition ${
                          level === l ? LEVEL_META[l].color : "border-border text-fg-muted hover:border-pink-400"
                        }`}
                      >
                        {LEVEL_META[l].label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-xs text-fg-muted">數量 (1-6)</span>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={count}
                        onChange={(e) => setCount(Math.max(1, Math.min(6, Number(e.target.value) || 1)))}
                        className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-400 mt-1"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-fg-muted">類別</span>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-400 mt-1"
                      >
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs text-fg-muted">額外要求 (選填、例如「題目要跟電商相關」)</span>
                    <input
                      value={hint}
                      onChange={(e) => setHint(e.target.value)}
                      placeholder="可以告訴 AI 想要的方向..."
                      className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-400 mt-1"
                      maxLength={300}
                    />
                  </label>

                  {error && <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-2">⚠️ {error}</div>}

                  <button
                    onClick={generate}
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 text-black font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <><Loader2 size={14} className="animate-spin" /> AI 出題中（10-30 秒）...</> : <><Wand2 size={14} /> 開始生成 {count} 題</>}
                  </button>

                  <div className="text-[10px] text-fg-muted leading-relaxed pt-2 border-t border-border">
                    💡 AI 會看既有題目當範例、仿造難度跟風格、避免重複主題。<br/>
                    📊 限每小時 10 次 AI 出題。
                  </div>
                </div>
              )}

              {/* Generated preview list */}
              {generated.length > 0 && (
                <>
                  <div className="px-4 py-2 border-b border-border bg-bg-elevated flex items-center gap-2 text-xs">
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.size === generated.length}
                        onChange={toggleAll}
                        className="accent-pink-400"
                      />
                      全選 / 全不選
                    </label>
                    <span className="ml-auto text-fg-muted">勾 {selected.size} / {generated.length}</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {generated.map((c) => {
                      const isSelected = selected.has(c.tempId);
                      const isExpanded = expanded.has(c.tempId);
                      return (
                        <article
                          key={c.tempId}
                          className={`rounded-xl border transition ${isSelected ? "border-pink-400 bg-pink-500/5" : "border-border bg-bg-elevated/40"}`}
                        >
                          {/* Header */}
                          <div className="px-3 py-2 flex items-center gap-2 flex-wrap">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggle(c.tempId)}
                              className="accent-pink-400"
                            />
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${LEVEL_META[c.level].color}`}>
                              {LEVEL_META[c.level].label}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg text-fg-muted">{c.category}</span>
                            <h3 className="font-bold text-sm flex-1 min-w-0 truncate">{c.title}</h3>
                            <span className="text-[10px] text-yellow-400">+{c.xp_award} XP</span>
                            <button
                              onClick={() => toggleExpand(c.tempId)}
                              className="text-fg-muted hover:text-fg"
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </div>

                          {/* Preview */}
                          <div className="px-3 pb-2 text-xs text-fg-muted line-clamp-2">{c.scenario}</div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                              <div>
                                <div className="text-[10px] text-fg-muted mb-0.5">📋 任務</div>
                                <p className="text-xs whitespace-pre-wrap">{c.task}</p>
                              </div>
                              <details>
                                <summary className="text-[10px] text-cyan-300 cursor-pointer hover:text-cyan-200">📝 starter_code</summary>
                                <pre className="text-[10px] bg-[#0d1117] p-2 rounded mt-1 overflow-x-auto font-mono">{c.starter_code}</pre>
                              </details>
                              <details>
                                <summary className="text-[10px] text-orange-300 cursor-pointer hover:text-orange-200">🎯 test_code</summary>
                                <pre className="text-[10px] bg-[#0d1117] p-2 rounded mt-1 overflow-x-auto font-mono">{c.test_code}</pre>
                              </details>
                              <details>
                                <summary className="text-[10px] text-yellow-300 cursor-pointer hover:text-yellow-200">💡 hints ({c.hints.length})</summary>
                                <ul className="text-[10px] mt-1 space-y-0.5 list-decimal list-inside text-fg-muted">
                                  {c.hints.map((h, i) => <li key={i}>{h}</li>)}
                                </ul>
                              </details>
                              <details>
                                <summary className="text-[10px] text-emerald-300 cursor-pointer hover:text-emerald-200">✅ solution</summary>
                                <pre className="text-[10px] bg-[#0d1117] p-2 rounded mt-1 overflow-x-auto font-mono">{c.solution}</pre>
                                <ul className="text-[10px] mt-1 space-y-0.5 list-disc list-inside text-fg-muted">
                                  {c.solution_explain.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                              </details>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>

                  <div className="border-t border-border p-3 bg-bg-card flex items-center gap-2">
                    <button
                      onClick={reset}
                      disabled={inserting}
                      className="px-3 py-2 rounded-lg border border-border text-xs disabled:opacity-50"
                    >
                      重新生成
                    </button>
                    <button
                      onClick={insertSelected}
                      disabled={inserting || selected.size === 0}
                      className="ml-auto px-5 py-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-bold text-xs inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      {inserting ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                      加入 {selected.size} 題到挑戰庫
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
