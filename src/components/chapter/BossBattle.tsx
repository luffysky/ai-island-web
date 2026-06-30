"use client";
import { Chapter } from "@/lib/types";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Swords, RotateCcw } from "lucide-react";

export function BossBattle({ chapter, engine, isLoggedIn }: { chapter: Chapter; engine: any; isLoggedIn: boolean }) {
  const quiz = chapter.quiz!;
  const boss = chapter.boss;
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [bossHp, setBossHp] = useState(boss?.hp ?? 0);
  const [hearts, setHearts] = useState(5);
  const [currentQ, setCurrentQ] = useState(0);
  const [shake, setShake] = useState(false);

  const q = quiz.questions[currentQ];
  if (!boss) return null;
  if (!q) return null;

  const handleAnswer = (val: string) => {
    if (answers[q.id]) return;
    setAnswers(prev => ({ ...prev, [q.id]: val }));
    const isCorrect = val === q.answer;
    if (isCorrect) {
      const dmg = Math.floor(boss.hp / quiz.questions.length);
      setBossHp(p => Math.max(0, p - dmg));
    } else {
      setHearts(p => Math.max(0, p - 1));
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
    // 跳下一題或結算
    setTimeout(() => {
      if (currentQ < quiz.questions.length - 1) setCurrentQ(currentQ + 1);
      else submit({ ...answers, [q.id]: val });
    }, 1200);
  };

  const submit = async (finalAns: Record<string, string>) => {
    setSubmitted(true);
    if (!isLoggedIn) {
      // local-only result
      const correct = quiz.questions.filter(q => finalAns[q.id] === q.answer).length;
      setResult({ correct, total: quiz.questions.length, perfect: correct === quiz.questions.length, local: true });
      return;
    }
    const r = await engine.submitQuiz(chapter.id, quiz.id, finalAns, quiz.questions);
    setResult(r);
  };

  if (!started) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 rounded-2xl bg-gradient-to-br from-red-950/40 to-purple-950/40 border-2 border-red-500/40 text-center"
      >
        <div className="text-6xl mb-4 animate-pulse-glow inline-block rounded-full">{boss.emoji}</div>
        <h2 className="text-3xl font-bold mb-2 text-red-400 flex items-center justify-center gap-2"><Swords size={26} /> Boss 戰：{boss.name}</h2>
        <p className="text-fg-muted mb-1">{boss.description}</p>
        <div className="flex justify-center gap-6 my-6 text-sm">
          <span>HP <span className="text-red-400 font-bold">{boss.hp}</span></span>
          <span>題數 <span className="font-bold">{quiz.questions.length}</span></span>
          <span>勝利獎勵 <span className="text-yellow-400 font-bold">+{quiz.xpReward} XP</span></span>
        </div>
        <button
          onClick={() => setStarted(true)}
          className="px-8 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-bold hover:scale-105 transition-transform"
        >
          <Swords className="inline mr-2" size={18} /> 開戰！
        </button>
      </motion.div>
    );
  }

  if (submitted && result) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 rounded-2xl bg-bg-card border border-border text-center"
      >
        <div className="text-6xl mb-4">{result.perfect ? "🏆" : result.correct >= quiz.questions.length / 2 ? "✨" : "💀"}</div>
        <h2 className="text-3xl font-bold mb-2">
          {result.perfect ? "完美勝利！" : result.correct >= quiz.questions.length / 2 ? "戰勝 boss！" : "敗北⋯再試一次"}
        </h2>
        <p className="text-xl mb-4">{result.correct} / {quiz.questions.length} 答對</p>
        {result.xpAwarded > 0 && <p className="text-warning">+{result.xpAwarded} XP　+{result.zCoinAwarded} Z-coin</p>}

        {/* Show all questions + correct answers */}
        <div className="mt-8 space-y-4 text-left">
          {quiz.questions.map((q, i) => {
            const userAns = answers[q.id];
            const correct = userAns === q.answer;
            return (
              <div key={q.id} className={`p-4 rounded-lg border ${correct ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5"}`}>
                <div className="font-semibold mb-2">Q{i + 1}. {q.text}</div>
                <div className="text-sm space-y-1">
                  {q.options.map(o => (
                    <div key={o.value} className={
                      o.value === q.answer ? "text-green-400" :
                      o.value === userAns ? "text-red-400" :
                      "text-fg-muted"
                    }>
                      {o.value === q.answer && "✓ "}
                      {o.value === userAns && o.value !== q.answer && "✗ "}
                      {o.label}
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-fg-muted leading-relaxed">{q.explanation}</div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => { setStarted(false); setSubmitted(false); setAnswers({}); setCurrentQ(0); setBossHp(boss.hp); setHearts(5); setResult(null); }}
          className="mt-6 inline-flex items-center gap-1.5 px-6 py-2 bg-bg-elevated border border-border rounded-lg hover:border-accent"
        >
          <RotateCcw size={16} /> 再戰一次
        </button>
      </motion.div>
    );
  }

  if (hearts === 0) {
    return (
      <div className="p-8 rounded-2xl bg-red-950/40 border-2 border-red-500/40 text-center animate-fade-in">
        <div className="text-6xl mb-4">💀</div>
        <h2 className="text-2xl font-bold mb-2 text-red-400">敗北⋯</h2>
        <p className="text-fg-muted mb-4">你被 {boss.name} 擊倒了</p>
        <button onClick={() => { setStarted(false); setAnswers({}); setCurrentQ(0); setBossHp(boss.hp); setHearts(5); }} className="px-6 py-2 bg-accent text-black rounded-lg font-bold">捲土重來</button>
      </div>
    );
  }

  // Battle UI
  return (
    <div className={`p-6 rounded-2xl bg-gradient-to-br from-red-950/20 to-purple-950/20 border-2 border-red-500/30 ${shake ? "animate-shake" : ""}`}>
      {/* Boss + HP */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">{boss.emoji}</div>
        <div className="font-bold mb-2">{boss.name}</div>
        <div className="max-w-md mx-auto">
          <div className="h-3 bg-black/30 rounded-full overflow-hidden border border-red-500/30">
            <div className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-500" style={{ width: `${(bossHp / boss.hp) * 100}%` }} />
          </div>
          <div className="text-xs text-red-400 mt-1">HP {bossHp} / {boss.hp}</div>
        </div>
      </div>

      {/* Player hearts */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Heart key={i} size={20} className={i < hearts ? "text-red-500 fill-red-500" : "text-gray-700"} />
          ))}
        </div>
        <div className="text-fg-muted">Q {currentQ + 1} / {quiz.questions.length}</div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <h3 className="text-xl font-semibold mb-4">{q.text}</h3>
          <div className="space-y-2">
            {q.options.map(o => {
              const ans = answers[q.id];
              const isAnswered = !!ans;
              const isCorrect = o.value === q.answer;
              const isUser = o.value === ans;
              let cls = "border-border hover:border-accent bg-bg-card";
              if (isAnswered) {
                if (isCorrect) cls = "border-green-500 bg-green-500/10";
                else if (isUser) cls = "border-red-500 bg-red-500/10";
                else cls = "border-border bg-bg-card opacity-50";
              }
              return (
                <button
                  key={o.value}
                  onClick={() => handleAnswer(o.value)}
                  disabled={isAnswered}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${cls}`}
                >
                  <span className="font-mono text-sm mr-2">{o.value.toUpperCase()}.</span>
                  {o.label}
                  {isAnswered && isCorrect && <span className="ml-2 text-green-400">✓</span>}
                  {isAnswered && isUser && !isCorrect && <span className="ml-2 text-red-400">✗</span>}
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
