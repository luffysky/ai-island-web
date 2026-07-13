import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { ExternalLink, ArrowLeft, Trophy, CalendarClock, AlertTriangle, Building2, Globe, Bot } from "lucide-react";
import { RulesSummary } from "./RulesSummary";
import { FitAnalysis } from "./FitAnalysis";

export const dynamic = "force-dynamic";

async function getOpp(id: string) {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("opportunities").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const o = await getOpp(id);
  if (!o) return { title: "找不到這個機會 — AI 島" };
  return { title: `${o.name} — 機會島 | AI 島`, description: (o.description || o.prize_text || o.name).slice(0, 140) };
}

const REQS: { key: string; label: string }[] = [
  { key: "requires_demo", label: "需 Demo" },
  { key: "requires_pitch", label: "需 Pitch / 上台" },
  { key: "requires_video", label: "需影片" },
  { key: "requires_business_plan", label: "需商業計畫" },
  { key: "requires_company", label: "限公司" },
  { key: "requires_student", label: "限學生" },
];

export default async function OpportunityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await getOpp(id);
  if (!o) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      <Link href="/opportunities" className="inline-flex items-center gap-1 text-sm text-black/50 dark:text-white/50 hover:text-violet-600 dark:hover:text-violet-400 mb-4">
        <ArrowLeft className="w-4 h-4" /> 機會島
      </Link>

      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {o.category && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">{o.category}</span>}
        {o.is_free && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">免報名費</span>}
        {o.source_confidence !== "verified" && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> 資料待人工核實</span>}
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{o.name}</h1>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm text-black/60 dark:text-white/60">
        {o.organizer && <span className="inline-flex items-center gap-1"><Building2 className="w-4 h-4" /> {o.organizer}</span>}
        {o.country && <span className="inline-flex items-center gap-1"><Globe className="w-4 h-4" /> {o.country === "GLOBAL" ? "國際" : o.country}</span>}
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mt-5">
        {o.prize_text && (
          <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4">
            <div className="text-xs text-black/50 dark:text-white/50 mb-1 inline-flex items-center gap-1"><Trophy className="w-3.5 h-3.5 text-amber-500" /> 獎金 / 資源</div>
            <div className="text-sm font-medium">{o.prize_text}</div>
          </div>
        )}
        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4">
          <div className="text-xs text-black/50 dark:text-white/50 mb-1 inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> 報名時程</div>
          <div className="text-sm font-medium">
            {o.application_start ? `${o.application_start} 起` : ""}
            {o.application_deadline ? `${o.application_start ? " ~ " : "截止 "}${o.application_deadline}` : (o.application_start ? "" : "依官網公告")}
          </div>
        </div>
      </div>

      {o.description && <p className="mt-5 text-sm leading-relaxed whitespace-pre-wrap text-black/75 dark:text-white/75">{o.description}</p>}

      {/* 需備 */}
      {(() => {
        const reqs = REQS.filter((r) => (o as any)[r.key]);
        return reqs.length ? (
          <div className="mt-5">
            <div className="text-sm font-semibold mb-2">參賽需備</div>
            <div className="flex flex-wrap gap-1.5">
              {reqs.map((r) => <span key={r.key} className="text-xs px-2 py-1 rounded-full border border-black/10 dark:border-white/15 text-black/70 dark:text-white/70">{r.label}</span>)}
            </div>
          </div>
        ) : null;
      })()}

      {o.eligibility && (
        <div className="mt-5">
          <div className="text-sm font-semibold mb-1">報名資格</div>
          <p className="text-sm text-black/70 dark:text-white/70 whitespace-pre-wrap">{o.eligibility}</p>
        </div>
      )}

      {/* AI 工具（V3）：讀規則 + 適合度/缺件分析 */}
      <RulesSummary id={o.id} hasOwnData={!!(o.description || o.eligibility || o.prize_text)} />
      <FitAnalysis id={o.id} />

      {/* 丟給分身島幫我準備（預填指令到下令列、你看過再送；對外動作仍待批准）*/}
      {(() => {
        const prepGoal = `幫我準備報名「${o.name}」${o.organizer ? `（主辦：${o.organizer}）` : ""}${o.application_deadline ? `，報名截止 ${o.application_deadline}` : ""}。請：① 列出報名要準備的文件清單 ② 把重要日期整理成待辦與截止提醒 ③ 建議我現在該先做的 3 件事。需要對外的動作（報名/寄信）先問過我。`;
        return (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link href={`/agent?goal=${encodeURIComponent(prepGoal)}` as any} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 text-sm font-medium">
              <Bot className="w-4 h-4" /> 丟給分身島幫我準備
            </Link>
            {o.official_url && (
              <a href={o.official_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 px-4 py-2.5 text-sm font-medium">
                <ExternalLink className="w-4 h-4" /> 前往官方網站報名
              </a>
            )}
          </div>
        );
      })()}
      <p className="mt-4 text-[11px] text-black/40 dark:text-white/40">此頁資料整理自公開資訊、可能過時；報名前請以主辦單位官方公告為準。</p>
    </div>
  );
}
