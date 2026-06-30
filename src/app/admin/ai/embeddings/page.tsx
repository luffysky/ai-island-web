import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { PageHero } from "@/components/admin/PageHero";
import { BackfillClient } from "./BackfillClient";
import { AlertTriangle, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EmbeddingsAdminPage() {
  const admin = createSupabaseAdmin();
  let lessonTotal = 0, lessonEmbedded = 0, forumTotal = 0, forumEmbedded = 0;
  let setupError: string | null = null;

  try {
    const [
      { count: lt },
      { count: le },
      { count: ft },
      { count: fe },
    ] = await Promise.all([
      admin.from("lessons").select("*", { count: "exact", head: true }),
      admin.from("lessons").select("*", { count: "exact", head: true }).not("embedding", "is", null),
      admin.from("forum_threads").select("*", { count: "exact", head: true }),
      admin.from("forum_threads").select("*", { count: "exact", head: true }).not("embedding", "is", null),
    ]);
    lessonTotal = lt ?? 0;
    lessonEmbedded = le ?? 0;
    forumTotal = ft ?? 0;
    forumEmbedded = fe ?? 0;
  } catch (e: any) {
    setupError = e?.message ?? "查詢覆蓋率失敗、可能 ai_embeddings_migration.sql 沒跑";
  }

  const lessonPct = lessonTotal > 0 ? Math.round((lessonEmbedded / lessonTotal) * 100) : 0;
  const forumPct = forumTotal > 0 ? Math.round((forumEmbedded / forumTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHero
        emoji="🧠"
        title="AI 語意搜尋（Embeddings）"
        desc="把 75 章 lesson + 論壇主題跑 OpenAI text-embedding-3-small (1536 維)、學員 LINE AI 用 vector cosine 找最像的內容回答問題。沒 backfill 之前 AI 退回 ILIKE 模糊搜尋（弱很多）。"
        gradient="from-cyan-500/10 via-blue-500/10 to-indigo-500/10"
        borderColor="border-cyan-500/30"
      />

      {setupError && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
          <div className="font-bold mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> 後端尚未就緒</div>
          <div className="text-fg-mid">{setupError}</div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <CoverageCard
          label="📚 Lessons"
          total={lessonTotal}
          embedded={lessonEmbedded}
          pct={lessonPct}
        />
        <CoverageCard
          label="💭 Forum threads"
          total={forumTotal}
          embedded={forumEmbedded}
          pct={forumPct}
        />
      </div>

      <BackfillClient
        lessonNeedBackfill={lessonTotal - lessonEmbedded}
        forumNeedBackfill={forumTotal - forumEmbedded}
      />

      <div className="bg-bg-soft border border-border rounded-xl p-5 text-sm space-y-2">
        <div className="font-bold text-fg flex items-center gap-2"><BookOpen className="w-4 h-4" /> 怎麼用</div>
        <ul className="space-y-1 list-disc pl-5 text-fg-mid">
          <li>第一次：按「⚡ backfill 全部 lesson」、跑完約 1-2 分鐘、成本約 $0.015（750 lesson × $0.00002/1K tokens）</li>
          <li>新章節：寫完 import 進 DB 後、按「⚡ backfill 新章節 (lessons)」會只跑缺的</li>
          <li>論壇 backfill 主要用於後台搜尋、學員 LINE AI 也會用到</li>
          <li>「重算全部」是 force=true、會覆蓋已有 embedding（升 model 時用）</li>
        </ul>
      </div>
    </div>
  );
}

function CoverageCard({ label, total, embedded, pct }: { label: string; total: number; embedded: number; pct: number }) {
  const ok = pct >= 95;
  const warn = pct >= 50;
  const color = ok ? "from-green-500/20 to-emerald-500/20 border-green-500/40"
    : warn ? "from-yellow-500/15 to-orange-500/15 border-yellow-500/40"
    : "from-red-500/15 to-rose-500/15 border-red-500/40";
  return (
    <div className={`bg-gradient-to-br ${color} border rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-fg">{label}</div>
        <div className={`text-2xl font-bold ${ok ? "text-green-400" : warn ? "text-yellow-400" : "text-red-400"}`}>
          {pct}%
        </div>
      </div>
      <div className="text-sm text-fg-mid">{embedded.toLocaleString()} / {total.toLocaleString()} 已嵌入</div>
      <div className="mt-3 h-2 bg-bg rounded-full overflow-hidden">
        <div
          className={`h-full ${ok ? "bg-green-500" : warn ? "bg-yellow-500" : "bg-red-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
