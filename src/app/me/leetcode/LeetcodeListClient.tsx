"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Check, RefreshCcw, Loader2, Code2, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Problem = {
  id: string;
  number: number;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  url: string;
};

const DIFF_COLOR: Record<string, string> = {
  easy: "text-emerald-400 bg-emerald-500/10",
  medium: "text-yellow-400 bg-yellow-500/10",
  hard: "text-red-400 bg-red-500/10",
};

export function LeetcodeListClient({
  problems,
  solvedIds,
  leetcodeUsername,
  leetcodeStats,
}: {
  problems: Problem[];
  solvedIds: string[];
  leetcodeUsername: string | null;
  leetcodeStats: any;
}) {
  const toast = useToast();
  const [solved, setSolved] = useState<Set<string>>(new Set(solvedIds));
  const [diff, setDiff] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [tag, setTag] = useState<string>("all");
  const [busy, setBusy] = useState(false);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const p of problems) for (const t of p.tags ?? []) s.add(t);
    return Array.from(s).sort();
  }, [problems]);

  const filtered = useMemo(() => {
    return problems.filter((p) => {
      if (diff !== "all" && p.difficulty !== diff) return false;
      if (tag !== "all" && !p.tags?.includes(tag)) return false;
      return true;
    });
  }, [problems, diff, tag]);

  // 今日推薦 5 題（未解的、依難度均衡）
  const recommended = useMemo(() => {
    const unsolved = problems.filter((p) => !solved.has(p.id));
    const byDiff = { easy: [] as Problem[], medium: [] as Problem[], hard: [] as Problem[] };
    for (const p of unsolved) byDiff[p.difficulty].push(p);
    const pick: Problem[] = [];
    for (const d of ["easy", "easy", "medium", "medium", "hard"] as const) {
      const pool = byDiff[d];
      if (pool.length > 0) {
        const r = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        pick.push(r);
      }
    }
    return pick;
  }, [problems, solved]);

  const markSolved = async (id: string) => {
    const next = new Set(solved);
    next.add(id);
    setSolved(next);
    try {
      await fetch("/api/me/leetcode/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem_id: id }),
      });
      toast.success("已標記為解過");
    } catch { toast.error("標記失敗"); }
  };

  const syncStats = async () => {
    if (!leetcodeUsername) { toast.warning("先在主後台綁定 leetcode username"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/me/leetcode/sync", { method: "POST" });
      const j = await res.json();
      if (res.ok) {
        toast.success(`同步 ${j.added} 題已解`);
        if (j.added > 0) location.reload();
      } else {
        toast.error(j.error ?? "同步失敗");
      }
    } catch { toast.error("網路錯誤"); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Code2 size={24} /> Leetcode 推薦</h1>
          <p className="text-sm text-fg-muted mt-1">
            點題目開到 leetcode 寫、回來標已解。
            {leetcodeUsername && <span className="ml-2">已綁 @{leetcodeUsername}（總解 {leetcodeStats?.totalSolved ?? "?"} 題）</span>}
          </p>
        </div>
        <button onClick={syncStats} disabled={busy} className="px-4 py-2 rounded-lg bg-accent text-black font-bold text-sm flex items-center gap-1 disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          同步 leetcode 解題數
        </button>
      </header>

      {/* 今日推薦 */}
      {recommended.length > 0 && (
        <section className="rounded-xl bg-gradient-to-br from-accent/10 to-accent-2/10 border border-accent/30 p-4">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-accent" /> 今日推薦（5 題）
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {recommended.map((p) => (
              <ProblemCard key={p.id} p={p} solved={false} onMark={() => markSolved(p.id)} compact />
            ))}
          </div>
        </section>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-fg-muted">難度：</span>
        {(["all", "easy", "medium", "hard"] as const).map((d) => (
          <button key={d} onClick={() => setDiff(d)} className={`px-2.5 py-1 rounded-full ${diff === d ? "bg-accent text-black font-bold" : "border border-border hover:border-accent"}`}>
            {d === "all" ? "全部" : d}
          </button>
        ))}
        <span className="text-fg-muted ml-3">標籤：</span>
        <select value={tag} onChange={(e) => setTag(e.target.value)} className="bg-bg border border-border rounded-lg px-2 py-1 text-xs">
          <option value="all">全部</option>
          {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-fg-muted ml-auto">{filtered.length} 題 · 已解 {solved.size}</span>
      </div>

      {/* 列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {filtered.map((p) => (
          <ProblemCard key={p.id} p={p} solved={solved.has(p.id)} onMark={() => markSolved(p.id)} />
        ))}
      </div>
    </div>
  );
}

function ProblemCard({ p, solved, onMark, compact }: { p: Problem; solved: boolean; onMark: () => void; compact?: boolean }) {
  return (
    <div className={`rounded-xl border ${solved ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-bg-card"} p-3`}>
      <div className="flex items-start gap-2 mb-2">
        <span className="text-[10px] text-fg-muted font-mono">#{p.number}</span>
        <a href={p.url} target="_blank" rel="noopener" className="font-bold text-sm flex-1 hover:text-accent truncate">
          {p.title}
        </a>
        {solved && <Check size={14} className="text-emerald-400 flex-shrink-0" />}
      </div>
      <div className="flex items-center gap-1 flex-wrap mb-2">
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${DIFF_COLOR[p.difficulty]}`}>{p.difficulty}</span>
        {!compact && p.tags?.slice(0, 2).map((t) => (
          <span key={t} className="text-[9px] px-1 py-0.5 rounded bg-bg-elevated text-fg-muted">{t}</span>
        ))}
      </div>
      <div className="flex gap-1">
        <a href={p.url} target="_blank" rel="noopener" className="flex-1 text-xs px-2 py-1.5 rounded border border-border hover:border-accent text-center flex items-center justify-center gap-1">
          <ExternalLink size={11} /> 打開
        </a>
        {!solved && (
          <button onClick={onMark} className="text-xs px-2 py-1.5 rounded bg-accent text-black font-bold">
            ✓ 解過了
          </button>
        )}
      </div>
    </div>
  );
}
