"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";

type Recommendation = {
  chapter_id: number;
  chapter_title: string;
  lesson_id: string;
  lesson_title: string;
  reason: string;
};

export function NextLesson() {
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/next-lesson")
      .then((r) => r.json())
      .then((j) => setRec(j.recommendation ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl bg-bg-card border border-border p-4 text-sm text-fg-muted">
        <Loader2 size={14} className="animate-spin inline mr-1" /> 找適合你的下一個 lesson…
      </div>
    );
  }
  if (!rec) return null;

  return (
    <Link
      href={`/chapters/${rec.chapter_id}#lesson-${rec.lesson_id}` as any}
      className="block rounded-xl bg-gradient-to-br from-accent/15 via-accent-2/10 to-accent-3/5 border-2 border-accent/30 p-5 hover:border-accent transition group"
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl shrink-0">📚</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-xs text-accent font-bold mb-1">
            <Sparkles size={11} /> 今日推薦
          </div>
          <h3 className="font-bold text-lg truncate">{rec.lesson_title}</h3>
          <div className="text-xs text-fg-muted mt-0.5">
            Ch {String(rec.chapter_id).padStart(2, "0")} · {rec.chapter_title}
          </div>
          <p className="text-[11px] text-fg-muted mt-2 italic">💡 {rec.reason}</p>
        </div>
        <ArrowRight size={18} className="text-accent group-hover:translate-x-1 transition shrink-0" />
      </div>
    </Link>
  );
}
