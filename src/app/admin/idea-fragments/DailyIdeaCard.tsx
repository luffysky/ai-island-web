"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, CalendarHeart, RefreshCw } from "lucide-react";

type Idea = {
  id: string;
  title: string;
  summary: string;
  idea_type: string | null;
  why_it_works: string | null;
  next_steps: string[];
  connections: string[];
};

/**
 * 今日點子卡：每天自動挑一個。
 * 第一次打開且今天還沒有 → 自動生成一個（每天只燒一次 token）。
 */
export function DailyIdeaCard({
  initialDaily,
  fragmentCount,
}: {
  initialDaily: Idea | null;
  fragmentCount: number;
}) {
  const [idea, setIdea] = useState<Idea | null>(initialDaily);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const tried = useRef(false);

  async function generate() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/idea-fragments/daily", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || "生成失敗");
      setIdea(json.idea);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  // 今天還沒有 → 自動生成一次（碎片夠才生）
  useEffect(() => {
    if (!idea && !tried.current && fragmentCount >= 2) {
      tried.current = true;
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-gradient-to-br from-violet-500/15 via-pink-500/10 to-amber-500/15 border border-violet-500/30 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="font-bold flex items-center gap-2 text-sm">
          <CalendarHeart size={16} className="text-violet-300" /> 今日點子
        </div>
        {idea && (
          <span className="text-[11px] text-fg-muted">
            {new Date().toLocaleDateString("zh-TW", { month: "long", day: "numeric" })} 的靈感
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-fg-muted py-3">
          <Loader2 size={16} className="animate-spin" /> AI 正在從你的碎片裡挑今天的點子…
        </div>
      ) : err ? (
        <div className="text-sm text-red-300 py-2 flex items-center justify-between gap-2">
          <span>⚠️ {err}</span>
          <button onClick={generate} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-bg-elevated hover:text-accent">
            <RefreshCw size={12} /> 重試
          </button>
        </div>
      ) : idea ? (
        <div>
          <div className="font-bold flex items-center gap-2">
            {idea.title}
            {idea.idea_type && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-normal">{idea.idea_type}</span>}
          </div>
          {idea.summary && <p className="text-sm text-fg-muted mt-1">{idea.summary}</p>}
          {idea.connections?.length > 0 && (
            <div className="mt-2 text-xs bg-bg-elevated/60 rounded-lg p-2 border-l-2 border-violet-400">
              <div className="font-bold text-violet-300 mb-0.5">🔗 為什麼這些碎片值得組合</div>
              <ul className="list-disc list-inside text-fg-muted space-y-0.5">
                {idea.connections.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
          {idea.why_it_works && (
            <p className="text-xs text-fg-muted mt-1.5"><span className="text-accent font-bold">為什麼成立：</span>{idea.why_it_works}</p>
          )}
          {idea.next_steps?.length > 0 && (
            <ul className="list-disc list-inside text-xs text-fg-muted mt-1.5 space-y-0.5">
              {idea.next_steps.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          )}
        </div>
      ) : (
        <div className="text-sm text-fg-muted py-2 flex items-center justify-between gap-2">
          <span>{fragmentCount < 2 ? "至少收集 2 個碎片，明天就會有今日點子。" : "今天還沒挑點子。"}</span>
          {fragmentCount >= 2 && (
            <button onClick={generate} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-violet-500/30 text-violet-200 hover:bg-violet-500/50">
              🎲 挑一個
            </button>
          )}
        </div>
      )}
    </div>
  );
}
