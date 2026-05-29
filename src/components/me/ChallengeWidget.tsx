"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, ExternalLink } from "lucide-react";

export function ChallengeWidget() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/challenge", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data?.problem) return null;

  const p = data.problem;
  const mine = data.mine;
  const lb = data.leaderboard ?? [];
  const myRank = lb.findIndex((r: any) => mine && r.name && false); // 之後 leaderboard 加 user_id 再判

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-bold flex items-center gap-2">🏆 本週 Challenge</h3>
        <span className="text-xs text-fg-muted">📅 {data.week}</span>
      </div>

      <div className="bg-bg-elevated rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="chip chip-warn text-[10px]">{p.difficulty}</span>
          {(p.tags ?? []).slice(0, 3).map((t: string) => (
            <span key={t} className="chip chip-neutral text-[10px]">#{t}</span>
          ))}
        </div>
        <p className="font-bold text-sm leading-tight">#{p.number} {p.title}</p>
      </div>

      {mine ? (
        <div className="flex items-center justify-between bg-accent/10 border border-accent/30 rounded-lg p-2.5 mb-2">
          <div className="flex items-center gap-2 text-sm">
            <Trophy size={14} className="text-amber-500" />
            <span>已提交 · <span className="font-bold text-accent">{mine.score ?? "?"}</span> 分</span>
          </div>
          <Link href="/me/challenge" className="text-xs text-accent hover:underline">看詳細 →</Link>
        </div>
      ) : (
        <Link href="/me/challenge" className="btn-chip btn-chip-success w-full justify-center py-2 text-sm">
          🚀 我來解
        </Link>
      )}

      {lb.length > 0 && (
        <div className="text-xs text-fg-muted mt-2 flex items-center gap-2 flex-wrap">
          <span>本週榜：</span>
          {lb.slice(0, 3).map((r: any) => (
            <span key={r.rank} className="font-medium text-fg">
              {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : "🥉"} {r.name} ({r.score})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
