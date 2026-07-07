import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getTranslations } from "next-intl/server";
import { GradingClient } from "./GradingClient";

export const dynamic = "force-dynamic";

export default async function TeacherGradingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const t = await getTranslations("teacher");
  const sp = await searchParams;
  const status = sp.status ?? "ungraded";

  const admin = createSupabaseAdmin();
  let q = admin
    .from("submissions")
    .select(`
      id, assignment_id, user_id, content_md, attachments,
      submitted_at, score, feedback_md, graded_at,
      assignment:assignments!submissions_assignment_id_fkey(title, max_score),
      user:profiles!submissions_user_id_fkey(username, display_name, avatar_url)
    `)
    .order("submitted_at", { ascending: false })
    .limit(100);
  if (status === "ungraded") q = q.is("graded_at", null);
  else if (status === "graded") q = q.not("graded_at", "is", null);

  const { data } = await q;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">✏️ {t("gradingTitle")}</h1>
          <p className="text-sm text-fg-muted mt-1">{t("gradingSubtitle")}</p>
        </div>
        <a
          href="/api/teacher/grading/export"
          className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-accent flex items-center gap-1"
        >
          📥 {t("exportCsv")}
        </a>
      </header>
      <GradingClient initial={(data ?? []) as any} filterStatus={status} />
    </div>
  );
}
