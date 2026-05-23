"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, RefreshCw, ArrowRight, Loader2, Calendar, Target } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatTW } from "@/lib/format-date";

type Plan = {
  id: string;
  depth: string;
  career_path: string | null;
  goal: string | null;
  schedule: string | null;
  plan_md: string;
  next_action: { chapter_id: number; lesson_id: string; reason: string } | null;
  weekly_chapters: Array<{ week: number; chapter_ids: number[]; hours: number; focus?: string }>;
  generated_by: string | null;
  created_at: string;
};

const CAREERS = [
  { id: "frontend", label: "🌱 前端工匠" },
  { id: "fullstack", label: "🚀 全端戰士" },
  { id: "ai-engineer", label: "🤖 AI 馴獸師" },
  { id: "data", label: "📊 資料煉金術士" },
  { id: "freelance", label: "💼 接案傭兵" },
  { id: "indie", label: "🏝️ 島民創業家" },
];

const DEPTHS = [
  { id: "lazy", label: "🌱 懶人包", desc: "每週 30-60 分鐘、看重點" },
  { id: "standard", label: "🚀 標準", desc: "每週 3-5 小時、循序漸進" },
  { id: "detail", label: "🎓 詳細", desc: "每週 10+ 小時、含實作 + portfolio" },
];

const SCHEDULES = [
  { id: "weekday_30min", label: "平日 30 分" },
  { id: "weekday_1h", label: "平日 1 小時" },
  { id: "weekend_3h", label: "假日 3 小時" },
  { id: "hardcore", label: "全力衝刺（每天 2+ 小時）" },
];

export function AiPlanClient({ initialPlan, defaultCareer }: { initialPlan: Plan | null; defaultCareer: string }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [plan, setPlan] = useState<Plan | null>(initialPlan);
  const [depth, setDepth] = useState<"lazy" | "standard" | "detail">("standard");
  const [career, setCareer] = useState(defaultCareer);
  const [goal, setGoal] = useState("");
  const [schedule, setSchedule] = useState("weekday_30min");
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    if (plan) {
      const ok = await confirm({
        title: "重新生成計畫？",
        description: "目前的計畫會被存成歷史紀錄、用新的取代。",
        confirmLabel: "重新生成",
      });
      if (!ok) return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/me/learning-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depth, career_path: career, goal, schedule }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "AI 生成失敗");
      setPlan(j.plan);
      toast.success("已生成個人化計畫");
      router.refresh();
    } catch (e: any) {
      toast.error(`生成失敗：${e?.message || ""}`);
    } finally {
      setGenerating(false);
    }
  };

  if (plan && !generating) {
    return (
      <div className="space-y-4">
        {/* 計畫 meta */}
        <div className="rounded-xl bg-gradient-to-br from-accent/15 to-accent-2/10 border border-accent/40 p-4">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Sparkles size={14} className="text-accent" />
            <span className="text-xs text-fg-muted">當前計畫</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated">{plan.depth}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated">{plan.career_path}</span>
            <span className="text-[10px] text-fg-muted ml-auto">{formatTW(plan.created_at)} · by {plan.generated_by?.split("/")[0]}</span>
          </div>
          {plan.goal && <p className="text-sm flex items-center gap-1"><Target size={12} /> {plan.goal}</p>}
          {plan.schedule && <p className="text-xs text-fg-muted flex items-center gap-1"><Calendar size={11} /> {plan.schedule}</p>}
        </div>

        {/* 下一步 */}
        {plan.next_action && (
          <Link
            href={`/chapters/${plan.next_action.chapter_id}#lesson-${plan.next_action.lesson_id}` as any}
            className="block rounded-xl bg-bg-card border-2 border-accent p-4 hover:scale-[1.01] transition"
          >
            <div className="text-xs text-accent font-bold mb-1">👉 馬上開始</div>
            <div className="text-lg font-bold">
              Ch {plan.next_action.chapter_id} · {plan.next_action.lesson_id}
            </div>
            <p className="text-sm text-fg-muted mt-1 italic">💡 {plan.next_action.reason}</p>
            <div className="text-xs text-accent mt-2 flex items-center gap-1">前往 <ArrowRight size={12} /></div>
          </Link>
        )}

        {/* 每週計畫 */}
        {plan.weekly_chapters?.length > 0 && (
          <section className="rounded-xl bg-bg-card border border-border p-4">
            <h2 className="font-bold mb-3 flex items-center gap-2">📅 週計畫</h2>
            <ol className="space-y-2">
              {plan.weekly_chapters.map((w) => (
                <li key={w.week} className="flex items-start gap-3 p-2 rounded-lg bg-bg">
                  <span className="flex-shrink-0 w-12 text-center font-bold text-accent">W{w.week}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{w.focus ?? "—"}</div>
                    <div className="text-[10px] text-fg-muted">
                      {w.hours} 小時 · 章節 {w.chapter_ids.join(", ")}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* 完整 markdown 計畫 */}
        <section className="rounded-xl bg-bg-card border border-border p-5">
          <div className="prose-custom max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{plan.plan_md}</ReactMarkdown>
          </div>
        </section>

        <button
          onClick={() => generate()}
          disabled={generating}
          className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-border hover:border-accent text-sm flex items-center justify-center gap-2"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          重新生成計畫
        </button>
      </div>
    );
  }

  // 沒計畫 → 填表 + 生成
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-bg-card border border-border p-5 space-y-4">
        <div>
          <label className="text-sm font-bold block mb-2">🎯 你的職涯路線</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {CAREERS.map((c) => (
              <button
                key={c.id}
                onClick={() => setCareer(c.id)}
                className={`px-3 py-2 rounded-lg border text-sm ${career === c.id ? "bg-accent text-black border-accent font-bold" : "border-border hover:border-accent"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-bold block mb-2">📚 深度</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {DEPTHS.map((d) => (
              <button
                key={d.id}
                onClick={() => setDepth(d.id as any)}
                className={`p-3 rounded-lg border text-left ${depth === d.id ? "bg-accent/10 border-accent" : "border-border hover:border-accent/40"}`}
              >
                <div className="font-bold text-sm">{d.label}</div>
                <div className="text-[10px] text-fg-muted mt-1">{d.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-bold block mb-2">⏰ 每週時間</label>
          <select value={schedule} onChange={(e) => setSchedule(e.target.value)} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm">
            {SCHEDULES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-bold block mb-2">💭 你的目標（選填）</label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="例如：3 個月後能投前端職、半年內做出自己的 SaaS、想接案賺零用..."
            rows={3}
            maxLength={500}
            className="w-full bg-bg border border-border rounded-lg p-2 text-sm"
          />
        </div>

        <button
          onClick={generate}
          disabled={generating}
          className="w-full px-6 py-3 rounded-xl bg-gradient-to-br from-accent to-accent-2 text-black font-bold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generating ? "AI 生成中（10-20 秒）…" : "🪄 讓 AI 為我規劃"}
        </button>
        <p className="text-[10px] text-fg-muted text-center">
          💡 AI 會看你完成的 lesson / quiz 表現、結合上面填的偏好、給專屬計畫。可隨時重新生成。
        </p>
      </div>
    </div>
  );
}
