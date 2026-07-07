import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { chapters } from "@/data/chapters";
import { CareerFunnel, type FunnelStage } from "@/components/career/CareerFunnel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "🎯 求職準備進度 · AI 島",
  description: "學課程 → 做作品 → 模擬面試 → 拿證書 → 完成履歷，一條求職成果閉環，關卡即時看真實進度。",
};

export default async function CareerPathPage() {
  const t = await getTranslations("learn");
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
      title: t("stageLearnTitle"),
      subtitle: t("stageLearnSubtitle"),
      detail: t("stageLearnDetail", { done: completedLessons, total: totalLessons, pct: coursePct }),
      href: "/chapters",
      cta: t("stageLearnCta"),
      done: coursePct >= 60,
      progress: coursePct,
      emptyHint: t("stageLearnHint"),
    },
    {
      key: "portfolio",
      icon: "palette",
      title: t("stagePortfolioTitle"),
      subtitle: t("stagePortfolioSubtitle"),
      detail:
        portfolioCount > 0
          ? t("stagePortfolioDetail", { count: portfolioCount, publicCount: publicPortfolios })
          : t("stagePortfolioEmpty"),
      href: "/me/portfolios",
      cta: t("stagePortfolioCta"),
      done: portfolioCount >= 1,
      progress: Math.min(portfolioCount, 3) / 3 * 100,
      emptyHint: t("stagePortfolioHint"),
    },
    {
      key: "interview",
      icon: "mic",
      title: t("stageInterviewTitle"),
      subtitle: t("stageInterviewSubtitle"),
      detail:
        mockCount > 0
          ? t("stageInterviewDetail", { count: mockCount, best: bestScore ?? "—" })
          : t("stageInterviewEmpty"),
      href: "/me/mock-interview",
      cta: t("stageInterviewCta"),
      done: mockCount >= 1,
      progress: mockCount > 0 ? Math.max(20, bestScore ?? 40) : 0,
      emptyHint: t("stageInterviewHint"),
    },
    {
      key: "certificate",
      icon: "award",
      title: t("stageCertTitle"),
      subtitle: t("stageCertSubtitle"),
      detail: certCount > 0 ? t("stageCertDetail", { count: certCount }) : t("stageCertEmpty"),
      href: "/me/certificates",
      cta: t("stageCertCta"),
      done: certCount >= 1,
      progress: Math.min(certCount, 3) / 3 * 100,
      emptyHint: t("stageCertHint"),
    },
    {
      key: "resume",
      icon: "fileText",
      title: t("stageResumeTitle"),
      subtitle: t("stageResumeSubtitle"),
      detail: resumeReady ? t("stageResumeReady") : t("stageResumeNotReady"),
      href: "/me/resume",
      cta: t("stageResumeCta"),
      done: resumeReady,
      progress: resumeReady ? 100 : Math.min(coursePct, 40),
      emptyHint: t("stageResumeHint"),
    },
  ];

  // 整體求職準備度 = 五關達成度平均
  const readiness = Math.round(
    stages.reduce((sum, s) => sum + (s.done ? 100 : Math.min(100, s.progress)), 0) / stages.length,
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">🎯 {t("careerPathTitle")}</h1>
        <p className="text-sm text-fg-muted mt-1">
          {t("careerPathSubtitle")}
        </p>
      </header>

      <CareerFunnel stages={stages} readiness={readiness} completedLessonIds={completedLessonIds} />
    </div>
  );
}
