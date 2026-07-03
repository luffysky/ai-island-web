import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { chapters } from "@/data/chapters";
import { CareerFunnel, type FunnelStage } from "@/components/career/CareerFunnel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "🎯 求職準備進度 · AI 島",
  description: "學課程 → 做作品 → 模擬面試 → 拿證書 → 完成履歷，一條求職成果閉環，關卡即時看真實進度。",
};

export default async function CareerPathPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/me/career-path");

  // 全部從真實查詢算（graceful：查詢失敗回空、不炸頁）
  const [
    progressRes,
    portfolioRes,
    mockRes,
    certRes,
  ] = await Promise.all([
    supabase.from("lesson_progress").select("chapter_id, lesson_id").eq("user_id", user.id),
    supabase.from("portfolios").select("id, is_public", { count: "exact" }).eq("user_id", user.id),
    supabase.from("mock_interview_sessions").select("overall_score", { count: "exact" }).eq("user_id", user.id),
    supabase.from("certificates").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ] as any);

  const progress = (progressRes.data ?? []) as { chapter_id: number; lesson_id: string }[];
  const completedLessonIds = progress.map((p) => p.lesson_id);
  const completedLessons = completedLessonIds.length;
  const totalLessons = chapters.reduce((sum, c) => sum + c.lessons.length, 0);
  const coursePct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const portfolioCount = (portfolioRes.count ?? (portfolioRes.data as any[])?.length ?? 0) as number;
  const publicPortfolios = ((portfolioRes.data as any[]) ?? []).filter((p) => p.is_public).length;

  const mockSessions = ((mockRes.data as any[]) ?? []);
  const mockCount = (mockRes.count ?? mockSessions.length) as number;
  const bestScore = mockSessions.reduce(
    (best: number | null, s: any) =>
      typeof s.overall_score === "number" ? Math.max(best ?? 0, s.overall_score) : best,
    null as number | null,
  );

  const certCount = (certRes.count ?? 0) as number;

  // 履歷不落地儲存（/me/resume 是即時 AI 生成）→ 判定「素材是否就緒」：
  // 生成 route 的門檻是「有學習資料」。素材充足才能生出有料的履歷。
  const resumeReady = completedLessons > 0 && (portfolioCount > 0 || certCount > 0);

  // ── 五關 ─────────────────────────────────────────────
  const stages: FunnelStage[] = [
    {
      key: "learn",
      icon: "bookOpen",
      title: "學完課程",
      subtitle: "打底：把該職涯路線的課上到有料",
      detail: `已完成 ${completedLessons} / ${totalLessons} 課（${coursePct}%）`,
      href: "/chapters",
      cta: "去上課",
      done: coursePct >= 60,
      progress: coursePct,
      emptyHint: "從第一章開始、完成 lesson 會即時反映在這裡",
    },
    {
      key: "portfolio",
      icon: "palette",
      title: "做出作品",
      subtitle: "把 playground 整理成可放履歷的公開作品集",
      detail:
        portfolioCount > 0
          ? `${portfolioCount} 件作品（公開 ${publicPortfolios} 件）`
          : "還沒有作品",
      href: "/me/portfolios",
      cta: "建立作品",
      done: portfolioCount >= 1,
      progress: Math.min(portfolioCount, 3) / 3 * 100,
      emptyHint: "把學過的 playground 一鍵整理成作品、面試最加分",
    },
    {
      key: "interview",
      icon: "mic",
      title: "模擬面試",
      subtitle: "雪鑰當面試官、練手感 + 拿評分回饋",
      detail:
        mockCount > 0
          ? `${mockCount} 場 · 最佳 ${bestScore ?? "—"} 分`
          : "還沒面試過",
      href: "/me/mock-interview",
      cta: "開始面試",
      done: mockCount >= 1,
      progress: mockCount > 0 ? Math.max(20, bestScore ?? 40) : 0,
      emptyHint: "先來一場、5 模式 14 行業可選、結束有完整評分",
    },
    {
      key: "certificate",
      icon: "award",
      title: "拿證書",
      subtitle: "完成整章自動發放章節完課證書",
      detail: certCount > 0 ? `已獲得 ${certCount} 張證書` : "還沒有證書",
      href: "/me/certificates",
      cta: "看證書資格",
      done: certCount >= 1,
      progress: Math.min(certCount, 3) / 3 * 100,
      emptyHint: "把任一章 lesson 全部完成、就會自動發證書",
    },
    {
      key: "resume",
      icon: "fileText",
      title: "完成履歷",
      subtitle: "雪鑰看你的學習資料自動生成 markdown 履歷",
      detail: resumeReady ? "素材就緒、可生成履歷" : "先累積學習資料再生成",
      href: "/me/resume",
      cta: "生成履歷",
      done: resumeReady,
      progress: resumeReady ? 100 : Math.min(coursePct, 40),
      emptyHint: "完成幾課、加一件作品或證書、雪鑰就有東西幫你寫",
    },
  ];

  // 整體求職準備度 = 五關達成度平均
  const readiness = Math.round(
    stages.reduce((sum, s) => sum + (s.done ? 100 : Math.min(100, s.progress)), 0) / stages.length,
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">🎯 求職準備進度</h1>
        <p className="text-sm text-fg-muted mt-1">
          從學課程到投履歷，一條完整的求職成果閉環。每一關都是你真實的資料、缺哪關就補哪關。
        </p>
      </header>

      <CareerFunnel stages={stages} readiness={readiness} completedLessonIds={completedLessonIds} />
    </div>
  );
}
