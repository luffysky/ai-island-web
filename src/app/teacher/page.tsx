import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServer } from "@/lib/supabase-server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TeacherOverviewPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createSupabaseAdmin();

  const [
    { count: assignmentsCount },
    { count: submissionsCount },
    { count: ungradedCount },
    { data: recentSubs },
  ] = await Promise.all([
    admin.from("assignments").select("*", { count: "exact", head: true }),
    admin.from("submissions").select("*", { count: "exact", head: true }),
    admin.from("submissions").select("*", { count: "exact", head: true }).is("graded_at", null),
    admin.from("submissions").select(`
      id, submitted_at, score,
      assignment:assignments!submissions_assignment_id_fkey(title),
      user:profiles!submissions_user_id_fkey(username, display_name)
    `).order("submitted_at", { ascending: false }).limit(10),
  ] as any);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📊 教師總覽</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="作業總數" value={assignmentsCount ?? 0} href="/teacher/assignments" />
        <Stat label="提交數" value={submissionsCount ?? 0} />
        <Stat label="待批改" value={ungradedCount ?? 0} href="/teacher/grading" tone="warning" />
      </div>

      <div className="rounded-xl bg-bg-card border border-border">
        <div className="px-4 py-2 border-b border-border text-sm font-bold">最新提交</div>
        {(recentSubs ?? []).length === 0 ? (
          <div className="text-center py-8 text-fg-muted text-sm">尚無提交</div>
        ) : (
          <ul className="divide-y divide-border">
            {recentSubs!.map((s: any) => (
              <li key={s.id} className="px-4 py-2 flex items-center gap-3">
                <span className="text-sm flex-1 truncate">{s.assignment?.title ?? "—"}</span>
                <span className="text-xs text-fg-muted">{s.user?.display_name || s.user?.username || "—"}</span>
                {s.score !== null ? (
                  <span className="text-xs text-accent font-bold">{s.score}</span>
                ) : (
                  <Link href={`/teacher/grading?id=${s.id}` as any} className="text-xs px-2 py-1 rounded-lg bg-yellow-500/15 text-yellow-900 dark:text-yellow-200">待批改</Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, href, tone }: { label: string; value: number; href?: string; tone?: "warning" }) {
  const color = tone === "warning" ? "text-warning" : "text-accent";
  const Inner = (
    <div className="rounded-xl bg-bg-card border border-border p-4 hover:border-accent transition">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${color}`}>{value.toLocaleString()}</div>
    </div>
  );
  return href ? <Link href={href as any} className="block">{Inner}</Link> : Inner;
}
