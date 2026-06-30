"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, AlertCircle, ChevronDown, ChevronRight, Circle } from "lucide-react";

type Issue = { type?: string; severity: string; lesson?: string; lesson_number?: string; note?: string; issue?: string; suggestion?: string };
type ChapterResult = { id: number; title: string; lesson_count: number; issues: Issue[]; ai_issues?: Issue[]; overall?: string; ai_error?: string };

const SEV_STYLE: Record<string, string> = {
  high: "chip-danger",
  med: "chip-warn",
  low: "chip-neutral",
};

export function ChaptersAuditClient() {
  const [results, setResults] = useState<ChapterResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [aiLoading, setAiLoading] = useState<Record<number, boolean>>({});

  useEffect(() => { scanWeak(); }, []);

  async function scanWeak() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/chapters/audit", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "weak" }),
      });
      const j = await r.json();
      setResults(j.chapters ?? []);
    } finally { setLoading(false); }
  }

  async function aiAudit(chapterId: number) {
    setAiLoading((s) => ({ ...s, [chapterId]: true }));
    try {
      const r = await fetch("/api/admin/chapters/audit", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_id: chapterId, scope: "weak" }),
      });
      const j = await r.json();
      const ch = j.chapters?.[0];
      if (ch) {
        setResults((rs) => rs.map((r) => (r.id === chapterId ? { ...r, ai_issues: ch.ai_issues, overall: ch.overall, ai_error: ch.ai_error } : r)));
        setExpanded((s) => ({ ...s, [chapterId]: true }));
      }
    } finally {
      setAiLoading((s) => ({ ...s, [chapterId]: false }));
    }
  }

  function toggle(id: number) {
    setExpanded((s) => ({ ...s, [id]: !s[id] }));
  }

  const withIssues = results.filter((r) => r.issues.length > 0);
  const totalIssues = withIssues.reduce((s, r) => s + r.issues.length, 0);

  return (
    <div>
      <div className="bg-bg-card border border-border rounded-xl p-3 mb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm">
          掃了 <span className="font-bold">{results.length}</span> 章、
          <span className="font-bold text-amber-500">{withIssues.length}</span> 章有問題、
          共 <span className="font-bold text-red-500">{totalIssues}</span> 個 issue
        </div>
        <button onClick={scanWeak} disabled={loading} className="btn-chip btn-chip-info">
          {loading ? <Loader2 size={14} className="animate-spin" /> : null} 重新掃
        </button>
      </div>

      {loading && results.length === 0 ? (
        <div className="py-16 text-center text-fg-muted"><Loader2 size={24} className="animate-spin mx-auto" /></div>
      ) : (
        <div className="space-y-2">
          {withIssues.map((ch) => {
            const counts = { high: 0, med: 0, low: 0 };
            for (const i of ch.issues) counts[(i.severity as "high"|"med"|"low") ?? "low"]++;
            const isExpanded = !!expanded[ch.id];
            return (
              <div key={ch.id} className="bg-bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggle(ch.id)}
                  className="w-full text-left p-3 hover:bg-bg-elevated transition flex items-center gap-2"
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="font-semibold flex-1">Ch{ch.id} {ch.title}</span>
                  <span className="text-xs text-fg-muted">{ch.lesson_count} lesson</span>
                  {counts.high > 0 && <span className="chip chip-danger text-[10px] inline-flex items-center gap-1"><Circle className="w-2.5 h-2.5 fill-current" /> {counts.high}</span>}
                  {counts.med > 0 && <span className="chip chip-warn text-[10px] inline-flex items-center gap-1"><Circle className="w-2.5 h-2.5 fill-current" /> {counts.med}</span>}
                  {counts.low > 0 && <span className="chip chip-neutral text-[10px] inline-flex items-center gap-1"><Circle className="w-2.5 h-2.5 fill-current" /> {counts.low}</span>}
                </button>

                {isExpanded && (
                  <div className="border-t border-border p-3 space-y-2">
                    {ch.issues.map((i, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm bg-bg-elevated rounded p-2">
                        <AlertCircle size={14} className={`shrink-0 mt-0.5 ${i.severity === "high" ? "text-red-500" : i.severity === "med" ? "text-amber-500" : "text-gray-500"}`} />
                        <div className="flex-1">
                          <div className="font-medium">
                            <span className={`chip text-[10px] ${SEV_STYLE[i.severity]}`}>{i.severity}</span>
                            <span className="ml-1.5 text-xs text-fg-muted">{i.lesson}</span>
                            <span className="ml-1 text-[10px] text-fg-muted">[{i.type}]</span>
                          </div>
                          <div className="text-xs text-fg-muted mt-0.5">{i.note}</div>
                        </div>
                      </div>
                    ))}

                    {/* AI 深度檢查 */}
                    {!ch.ai_issues && (
                      <button onClick={() => aiAudit(ch.id)} disabled={aiLoading[ch.id]} className="btn-chip btn-chip-info text-xs">
                        {aiLoading[ch.id] ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        雪鑰深度 audit
                      </button>
                    )}
                    {ch.overall && (
                      <blockquote className="border-l-2 border-accent-2 pl-3 italic text-sm my-3">
                        💬 {ch.overall}
                      </blockquote>
                    )}
                    {ch.ai_error && <p className="text-xs text-red-500">AI fail: {ch.ai_error}</p>}
                    {ch.ai_issues && ch.ai_issues.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <h4 className="text-xs font-bold text-fg-muted uppercase">雪鑰建議</h4>
                        {ch.ai_issues.map((i, idx) => (
                          <div key={idx} className="bg-bg-elevated rounded p-2.5 border-l-2 border-accent-2">
                            <div className="flex items-center gap-2">
                              <span className={`chip text-[10px] ${SEV_STYLE[i.severity]}`}>{i.severity}</span>
                              <span className="text-xs font-medium">{i.lesson_number}</span>
                            </div>
                            <p className="text-sm mt-1">❗ {i.issue}</p>
                            <p className="text-xs text-fg-muted mt-1">💡 {i.suggestion}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {!loading && withIssues.length === 0 && (
            <p className="text-center py-12 text-fg-muted">🎉 所有章節都通過品質檢查</p>
          )}
        </div>
      )}
    </div>
  );
}
