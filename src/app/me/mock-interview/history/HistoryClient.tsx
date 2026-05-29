"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, ChevronDown, ChevronRight, Trophy } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  frontend: "前端", backend: "後端", fullstack: "全端", mobile: "行動 App",
  ai: "AI / ML", data: "資料工程", devops: "DevOps",
  designer: "設計師 UI/UX", pm: "產品經理",
  marketing: "行銷 / 成長", content: "內容創作",
  freelance: "接案", indie: "Indie", founder: "創業 pitch",
};

const MODE_LABEL: Record<string, string> = {
  tech: "💻 技術", behavior: "🗣️ 行為", "system-design": "🏗️ 系統設計",
  portfolio: "🖼️ 作品集", case: "🧩 Case",
};

export function HistoryClient() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/me/mock-interview/history", { credentials: "include" });
      const j = await r.json();
      setSessions(j.sessions ?? []);
    } finally { setLoading(false); }
  }

  async function del(id: string) {
    if (!confirm("刪除這次面試記錄？")) return;
    await fetch(`/api/me/mock-interview/history?id=${id}`, { method: "DELETE", credentials: "include" });
    setSessions((ss) => ss.filter((s) => s.id !== id));
  }

  if (loading) return <div className="py-16 text-center"><Loader2 size={20} className="animate-spin mx-auto" /></div>;
  if (sessions.length === 0) return <p className="py-16 text-center text-fg-muted">還沒面試記錄、去面一場</p>;

  const avgScore = sessions.filter((s) => s.overall_score != null).reduce((s, x) => s + x.overall_score, 0) / sessions.filter((s) => s.overall_score != null).length || 0;

  return (
    <div>
      {/* 統計 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-extrabold text-accent">{sessions.length}</div>
          <div className="text-xs text-fg-muted">總面試場次</div>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-extrabold text-amber-500">{avgScore ? avgScore.toFixed(1) : "—"}</div>
          <div className="text-xs text-fg-muted">平均分</div>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-extrabold text-green-500">{Math.max(0, ...sessions.map((s) => s.overall_score ?? 0))}</div>
          <div className="text-xs text-fg-muted">最高分</div>
        </div>
      </div>

      {/* 列表 */}
      <div className="space-y-2">
        {sessions.map((s) => {
          const isExp = !!expanded[s.id];
          return (
            <div key={s.id} className="bg-bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded((st) => ({ ...st, [s.id]: !st[s.id] }))}
                className="w-full text-left p-3 hover:bg-bg-elevated transition flex items-center gap-3 flex-wrap"
              >
                {isExp ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="font-semibold">{MODE_LABEL[s.mode] ?? s.mode}</span>
                <span className="chip chip-neutral text-[10px]">{ROLE_LABEL[s.role] ?? s.role}</span>
                <span className="text-xs text-fg-muted">{new Date(s.created_at).toLocaleString("zh-TW")}</span>
                <span className="flex-1" />
                {s.overall_score != null && (
                  <div className="flex items-center gap-1">
                    <Trophy size={14} className="text-amber-500" />
                    <span className="font-bold text-accent">{s.overall_score}</span>
                  </div>
                )}
              </button>
              {isExp && (
                <div className="border-t border-border p-3 space-y-3">
                  {s.comment && (
                    <blockquote className="border-l-2 border-accent-2 pl-3 italic text-sm">
                      💬 {s.comment}
                    </blockquote>
                  )}
                  {Array.isArray(s.breakdown) && s.breakdown.length > 0 && (
                    <div className="space-y-1.5">
                      {s.breakdown.map((b: any, i: number) => (
                        <div key={i} className="bg-bg-elevated rounded p-2">
                          <div className="flex justify-between text-sm font-medium">
                            <span>{b.aspect}</span>
                            <span>{b.score}</span>
                          </div>
                          <div className="h-1 bg-bg rounded overflow-hidden mt-1">
                            <div className="h-full bg-accent" style={{ width: `${b.score}%` }} />
                          </div>
                          {b.note && <p className="text-xs text-fg-muted mt-1">{b.note}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {Array.isArray(s.next_steps) && s.next_steps.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold mb-1.5">📝 下一步</h4>
                      <ul className="space-y-1">
                        {s.next_steps.map((n: string, i: number) => (
                          <li key={i} className="bg-bg-elevated rounded p-2 text-sm">• {n}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button onClick={() => del(s.id)} className="btn-chip btn-chip-danger text-xs">
                    <Trash2 size={12} /> 刪除
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
