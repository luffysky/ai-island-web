"use client";

import { useEffect, useState } from "react";
import { Code2, ExternalLink, RefreshCcw, Link2Off, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Stats = {
  username: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalQuestions: number;
  easyTotal: number;
  mediumTotal: number;
  hardTotal: number;
  acceptanceRate: number;
  ranking: number;
  fetchedAt: string;
};

export function LeetcodeCard() {
  const toast = useToast();
  const [username, setUsername] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/leetcode")
      .then((r) => r.json())
      .then((j) => { setUsername(j.username); setStats(j.stats); })
      .finally(() => setLoading(false));
  }, []);

  const bind = async () => {
    const u = input.trim();
    if (!u) return;
    setBusy(true);
    try {
      const res = await fetch("/api/me/leetcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u }),
      });
      const j = await res.json();
      if (res.ok) {
        setUsername(j.username); setStats(j.stats); setInput("");
        toast.success(`已綁定 ${j.username}`);
      } else {
        toast.error(j.error === "invalid_username" ? "username 格式不對" : "找不到該帳號或無資料");
      }
    } catch { toast.error("網路錯誤"); }
    finally { setBusy(false); }
  };

  const refresh = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/me/leetcode");
      const j = await res.json();
      setStats(j.stats);
      toast.info("已更新");
    } finally { setBusy(false); }
  };

  const unbind = async () => {
    if (!confirm("解除 leetcode 綁定？")) return;
    await fetch("/api/me/leetcode", { method: "DELETE" });
    setUsername(null); setStats(null);
    toast.info("已解除綁定");
  };

  if (loading) return null;

  return (
    <div className="rounded-xl bg-bg-card border border-border p-4">
      <h2 className="font-bold mb-3 flex items-center gap-2">
        <Code2 size={16} /> Leetcode 解題進度
      </h2>
      {!username ? (
        <div>
          <p className="text-xs text-fg-muted mb-3">綁定 leetcode username、自動同步你的解題進度</p>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="leetcode username"
              className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm"
            />
            <button onClick={bind} disabled={busy || !input.trim()} className="px-4 py-2 rounded-lg bg-accent text-black font-bold text-sm disabled:opacity-40">
              {busy ? <Loader2 size={14} className="animate-spin" /> : "綁定"}
            </button>
          </div>
        </div>
      ) : !stats ? (
        <div className="text-sm text-fg-muted">已綁定 {username}、但抓不到資料</div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <a href={`https://leetcode.com/${stats.username}/`} target="_blank" rel="noopener" className="text-sm font-bold hover:text-accent inline-flex items-center gap-1">
              @{stats.username} <ExternalLink size={11} />
            </a>
            <span className="text-[10px] text-fg-muted">Rank #{stats.ranking.toLocaleString()}</span>
            <div className="ml-auto flex gap-1">
              <button onClick={refresh} disabled={busy} title="重新整理" className="p-1.5 hover:bg-bg-elevated rounded">
                {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
              </button>
              <button onClick={unbind} title="解除綁定" className="p-1.5 hover:bg-bg-elevated rounded text-fg-muted">
                <Link2Off size={12} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <DiffCell label="Easy" solved={stats.easySolved} total={stats.easyTotal} color="text-emerald-400" />
            <DiffCell label="Medium" solved={stats.mediumSolved} total={stats.mediumTotal} color="text-yellow-400" />
            <DiffCell label="Hard" solved={stats.hardSolved} total={stats.hardTotal} color="text-red-400" />
          </div>
          <div className="text-xs text-fg-muted flex items-center justify-between">
            <span>總解 <span className="font-bold text-accent">{stats.totalSolved}</span> / {stats.totalQuestions}</span>
            <span>通過率 {stats.acceptanceRate}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

function DiffCell({ label, solved, total, color }: { label: string; solved: number; total: number; color: string }) {
  const pct = total > 0 ? (solved / total) * 100 : 0;
  return (
    <div className="bg-bg-elevated rounded-lg p-2 text-center">
      <div className={`text-xs font-bold ${color}`}>{label}</div>
      <div className="text-base font-bold mt-0.5">{solved}</div>
      <div className="text-[9px] text-fg-muted">/ {total}</div>
      <div className="h-1 bg-bg rounded-full overflow-hidden mt-1">
        <div className={`h-full ${color.replace("text-", "bg-")}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
