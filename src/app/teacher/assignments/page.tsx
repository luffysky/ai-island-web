import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getTranslations } from "next-intl/server";
import { AssignmentsClient } from "./AssignmentsClient";

export const dynamic = "force-dynamic";

export default async function TeacherAssignmentsPage() {
  const t = await getTranslations("teacher");
  const admin = createSupabaseAdmin();
  const { data: assignments } = await admin
    .from("assignments")
    .select(`*`)
    .order("created_at", { ascending: false });

  // 每個作業的提交數
  const submissionCounts: Record<string, { total: number; graded: number }> = {};
  for (const a of assignments ?? []) {
    const id = (a as any).id;
    const { count: total } = await admin.from("submissions").select("*", { count: "exact", head: true }).eq("assignment_id", id);
    const { count: graded } = await admin.from("submissions").select("*", { count: "exact", head: true }).eq("assignment_id", id).not("graded_at", "is", null);
    submissionCounts[id] = { total: total ?? 0, graded: graded ?? 0 };
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">📋 {t("assignmentsTitle")}</h1>
        <p className="text-sm text-fg-muted mt-1">{t("assignmentsSubtitle")}</p>
      </header>
      <AssignmentsClient initial={(assignments ?? []) as any} submissionCounts={submissionCounts} />
    </div>
  );
}
