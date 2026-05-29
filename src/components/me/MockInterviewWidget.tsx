"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trophy, Sparkles } from "lucide-react";

export function MockInterviewWidget() {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/mock-interview/history", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => setData(j.sessions ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  const sessions = data ?? [];

  // 沒記錄：show CTA
  if (sessions.length === 0) {
    return (
      <div className="bg-bg-card border border-border rounded-xl p-4 flex items-center gap-3 flex-wrap">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl shrink-0">🎤</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold">第一次面試？</h3>
          <p className="text-xs text-fg-muted">雪鑰當面試官、5 模式 14 行業可選、結束有完整評分</p>
        </div>
        <Link href="/me/mock-interview" className="btn-chip btn-chip-success">
          <Sparkles size={12} /> 開始
        </Link>
      </div>
    );
  }

  const last = sessions[0];
  const withScore = sessions.filter((s) => s.overall_score != null);
  const avg = withScore.length > 0 ? withScore.reduce((s, x) => s + x.overall_score, 0) / withScore.length : 0;
  const best = Math.max(0, ...sessions.map((s) => s.overall_score ?? 0));

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-bold flex items-center gap-2">🎤 AI 模擬面試</h3>
        <Link href="/me/mock-interview/history" className="text-xs text-accent hover:underline">看全部 →</Link>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Stat label="總場次" value={sessions.length} color="text-accent" />
        <Stat label="平均分" value={avg ? avg.toFixed(0) : "—"} color="text-amber-500" />
        <Stat label="最高分" value={best || "—"} color="text-green-500" />
      </div>
      <div className="bg-bg-elevated rounded p-2.5 flex items-center gap-2 flex-wrap">
        <Trophy size={14} className="text-amber-500 shrink-0" />
        <span className="text-sm flex-1">
          上次 <span className="font-bold">{last.mode}</span> · <span className="text-fg-muted">{last.role}</span>
          {last.overall_score != null && <span className="ml-2 font-bold text-accent">{last.overall_score} 分</span>}
        </span>
        <Link href="/me/mock-interview" className="btn-chip btn-chip-info text-xs">再面一場</Link>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="bg-bg-elevated rounded p-2 text-center">
      <div className={`text-lg font-extrabold ${color}`}>{value}</div>
      <div className="text-[10px] text-fg-muted">{label}</div>
    </div>
  );
}
