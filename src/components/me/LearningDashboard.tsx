"use client";

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from "recharts";

type Data = {
  mastered: number; read: number; skim: number;
  totalStudyMinutes: number; quizPassed: number; playgroundRun: number;
  completedCount: number; totalLessons: number;
  level: number; xp: number; elo: number;
  chapterProgress: { id: number; title: string; furthestPct: number; donePct: number }[];
  quizTrend: { date: string; acc: number }[];
};

const MASTERY_COLORS = ["#22c55e", "#3b82f6", "#9ca3af"];

export function LearningDashboard({ data }: { data: Data }) {
  const masteryPie = [
    { name: "已掌握", value: data.mastered },
    { name: "已讀完", value: data.read },
    { name: "掃過", value: data.skim },
  ].filter((d) => d.value > 0);

  const hours = Math.floor(data.totalStudyMinutes / 60);
  const mins = data.totalStudyMinutes % 60;
  const studyLabel = hours > 0 ? `${hours} 小時 ${mins} 分` : `${mins} 分`;
  const overallPct = data.totalLessons > 0 ? Math.round((data.completedCount / data.totalLessons) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">📊 學習儀表板</h1>
        <p className="text-sm text-fg-muted mt-1">你的閱讀深度、掌握度、學習時間與測驗趨勢一覽。</p>
      </div>

      {/* 統計卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="累積學習時間" value={studyLabel} color="text-accent" />
        <Stat label="完成 lesson" value={`${data.completedCount} / ${data.totalLessons}`} sub={`${overallPct}%`} color="text-yellow-400" />
        <Stat label="miniQuiz 答對" value={data.quizPassed} color="text-blue-400" />
        <Stat label="跑過 playground" value={data.playgroundRun} color="text-emerald-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 掌握度分布 */}
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <h2 className="font-bold mb-3">🎯 掌握度分布</h2>
          {masteryPie.length === 0 ? (
            <p className="text-sm text-fg-muted py-12 text-center">還沒有閱讀紀錄，去讀幾節課就會出現。</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={180}>
                <PieChart>
                  <Pie data={masteryPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {masteryPie.map((_, i) => <Cell key={i} fill={MASTERY_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1b1d23", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 text-sm">
                {masteryPie.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: MASTERY_COLORS[i] }} />
                    <span className="text-fg-muted">{d.name}</span>
                    <span className="font-bold tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 測驗準確率趨勢 */}
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <h2 className="font-bold mb-3">🧠 每日測驗準確率</h2>
          {data.quizTrend.length === 0 ? (
            <p className="text-sm text-fg-muted py-12 text-center">還沒做過每日測驗。</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data.quizTrend} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d35" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <Tooltip contentStyle={{ background: "#1b1d23", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`${v}%`, "準確率"]} />
                <Line type="monotone" dataKey="acc" stroke="#facc15" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 每章：最遠到達 vs 已完成 */}
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <h2 className="font-bold mb-3">📚 各章進度（最遠到達 vs 已完成）</h2>
        {data.chapterProgress.length === 0 ? (
          <p className="text-sm text-fg-muted py-6 text-center">還沒開始任何章節。</p>
        ) : (
          <div className="space-y-3">
            {data.chapterProgress.map((c) => (
              <div key={c.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="truncate pr-2">{c.title}</span>
                  <span className="text-fg-muted shrink-0">完成 {c.donePct}% · 讀到 {c.furthestPct}%</span>
                </div>
                <div className="h-2 bg-bg rounded-full overflow-hidden relative">
                  {/* 最遠到達（淺）疊已完成（深）*/}
                  <div className="absolute inset-y-0 left-0 bg-accent/25 rounded-full" style={{ width: `${c.furthestPct}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-yellow-400 rounded-full" style={{ width: `${c.donePct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="等級" value={`Lv ${data.level}`} color="text-purple-400" />
        <Stat label="XP" value={data.xp} color="text-accent" />
        <Stat label="解題段位 ELO" value={data.elo} color="text-pink-400" />
      </div>
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: any; sub?: string; color: string }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>
        {value}
        {sub && <span className="text-sm text-fg-muted ml-1.5">{sub}</span>}
      </div>
    </div>
  );
}
