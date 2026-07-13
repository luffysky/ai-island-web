import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { scoreOpportunity, type ScorableOpp } from "@/lib/opportunity-fit";
import { Compass, Trophy, CalendarClock, ExternalLink, Bot, AlertTriangle } from "lucide-react";

export const metadata: Metadata = { title: "機會雷達（AI 島專屬）— 後台" };
export const dynamic = "force-dynamic";

interface OppRow extends ScorableOpp {
  id: string; name: string; organizer?: string | null; official_url?: string | null; prize_text?: string | null;
}

function daysLeft(deadline?: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline + "T23:59:59+08:00").getTime() - Date.now()) / 86400_000);
}

export default async function AdminOpportunityRadar() {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("opportunities")
    .select("id, name, organizer, category, tags, official_url, prize_text, prize_amount, is_free, is_online, requires_pitch, requires_demo, requires_business_plan, requires_student, application_deadline, status")
    .in("status", ["open", "upcoming"]).limit(300);

  const now = Date.now();
  const ranked = (data ?? [])
    .map((o) => ({ o: o as OppRow, fit: scoreOpportunity(o as ScorableOpp, now) }))
    .filter((x) => x.fit.blockers.length === 0)   // 已截止/限學生 等硬性不符先濾掉
    .sort((a, b) => b.fit.score - a.fit.score)
    .slice(0, 30);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Compass className="w-6 h-6 text-accent" /> 機會雷達 · AI 島最該投的</h1>
        <p className="text-sm text-fg-muted mt-1">用規則引擎（非 AI、零成本）依 AI 島 profile（AI 教育／Agent／SaaS／創作平台／有 Demo·課程／pre-revenue）自動排序。分數只是相對參考、報名前人工確認。</p>
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> 已截止／限學生等硬性不符已自動濾掉；資料多為 unverified、以官網為準。</p>
      </div>

      {ranked.length === 0 ? (
        <p className="text-sm text-fg-muted py-10 text-center">目前沒有進行中的機會可排。去機會島新增資料、或等雷達（V4）自動抓。</p>
      ) : (
        <ol className="space-y-2.5">
          {ranked.map(({ o, fit }, i) => {
            const dl = daysLeft(o.application_deadline);
            const prepGoal = `幫 AI 島準備報名「${o.name}」${o.organizer ? `（主辦：${o.organizer}）` : ""}${o.application_deadline ? `，報名截止 ${o.application_deadline}` : ""}。AI 島是 AI 教育/Agent/SaaS 平台、有 Demo 和課程、pre-revenue。請：① 列報名要準備的文件清單 ② 把重要日期整理成待辦 ③ 建議現在該先做的 3 件事。對外動作先問我。`;
            return (
              <li key={o.id} className="rounded-2xl border border-border bg-bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 flex flex-col items-center">
                    <span className="text-xs text-fg-muted">#{i + 1}</span>
                    <span className={`text-lg font-bold ${fit.score >= 60 ? "text-emerald-500" : fit.score >= 40 ? "text-amber-500" : "text-fg-muted"}`}>{fit.score}</span>
                    <span className="text-[9px] text-fg-muted">分</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/opportunities/${o.id}`} className="font-bold hover:text-accent">{o.name}</Link>
                    {o.organizer && <span className="text-xs text-fg-muted ml-2">{o.organizer}</span>}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {fit.reasons.map((r, j) => <span key={j} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">{r}</span>)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-fg-muted">
                      {o.prize_text && <span className="inline-flex items-center gap-1"><Trophy className="w-3.5 h-3.5 text-amber-500" /> {o.prize_text}</span>}
                      {o.application_deadline && (
                        <span className="inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> 截止 {o.application_deadline}
                          {dl != null && dl >= 0 && <span className={dl <= 14 ? "text-rose-500 font-semibold ml-1" : "ml-1"}>· 剩 {dl} 天</span>}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2.5">
                      <Link href={`/agent?goal=${encodeURIComponent(prepGoal)}` as any} className="inline-flex items-center gap-1 text-xs text-accent hover:underline"><Bot className="w-3.5 h-3.5" /> 丟給分身島幫我準備</Link>
                      {o.official_url && <a href={o.official_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-accent"><ExternalLink className="w-3.5 h-3.5" /> 官網</a>}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
