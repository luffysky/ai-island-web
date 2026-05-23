import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { MyAssignmentsClient } from "./MyAssignmentsClient";

export const dynamic = "force-dynamic";

export default async function MyAssignmentsPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createSupabaseAdmin();
  const { data: assignments } = await admin
    .from("assignments")
    .select(`id, title, description_md, chapter_id, lesson_id, due_date, is_required, max_score, created_at`)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(100);

  const ids = (assignments ?? []).map((a: any) => a.id);
  let mySubs: any[] = [];
  if (ids.length > 0) {
    const { data } = await admin
      .from("submissions")
      .select("id, assignment_id, content_md, submitted_at, score, feedback_md, graded_at")
      .eq("user_id", user.id)
      .in("assignment_id", ids);
    mySubs = data ?? [];
  }

  const submissionByAssignment: Record<string, any> = {};
  for (const s of mySubs) submissionByAssignment[s.assignment_id] = s;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📋 我的作業</h1>
      <p className="text-sm text-fg-muted">完成作業、teacher 批改後可看到分數與回饋。</p>
      <MyAssignmentsClient
        assignments={(assignments ?? []) as any}
        submissionByAssignment={submissionByAssignment}
      />
    </div>
  );
}
