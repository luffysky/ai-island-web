import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { formatTW } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export default async function TeacherStatsPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createSupabaseAdmin();

  // 我批改過的
  const sevenAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const thirtyAgo = new Date(Date.now() - 30 * 86400_000).toISOString();

  const [
    { count: totalGraded },
    { count: graded7d },
    { count: graded30d },
    { data: recent },
    { data: scores },
  ] = await Promise.all([
    admin.from("submissions").select("*", { count: "exact", head: true }).eq("graded_by", user.id),
    admin.from("submissions").select("*", { count: "exact", head: true }).eq("graded_by", user.id).gte("graded_at", sevenAgo),
    admin.from("submissions").select("*", { count: "exact", head: true }).eq("graded_by", user.id).gte("graded_at", thirtyAgo),
    admin.from("submissions").select(`
      id, graded_at, score,
      assignment:assignments!submissions_assignment_id_fkey(title, max_score),
      user:profiles!submissions_user_id_fkey(username, display_name)
    `).eq("graded_by", user.id).order("graded_at", { ascending: false }).limit(10),
    admin.from("submissions").select("score, assignment:assignments!submissions_assignment_id_fkey(max_score)").eq("graded_by", user.id).gte("graded_at", thirtyAgo),
  ] as any);

  // 平均給分（30 天）
  let avgPct = 0;
  if (scores && scores.length > 0) {
    const pcts = scores
      .filter((s: any) => s.score != null && s.assignment?.max_score)
      .map((s: any) => (s.score / s.assignment.max_score) * 100);
    avgPct = pcts.length > 0 ? pcts.reduce((a: number, b: number) => a + b, 0) / pcts.length : 0;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">📊 我的教師業績</h1>
        <p className="text-sm text-fg-muted mt-1">追蹤批改數、平均給分、回應速度。</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="批改總數" value={totalGraded ?? 0} />
        <Stat label="近 7 天" value={graded7d ?? 0} tone="accent" />
        <Stat label="近 30 天" value={graded30d ?? 0} />
        <Stat label="平均給分（30 天）" value={`${avgPct.toFixed(1)}%`} tone="accent" />
      </div>

      <div className="rounded-xl bg-bg-card border border-border">
        <div className="px-4 py-2 border-b border-border text-sm font-bold">最近批改</div>
        {(recent ?? []).length === 0 ? (
          <div className="text-center py-12 text-fg-muted text-sm">還沒批改過任何作業</div>
        ) : (
          <ul className="divide-y divide-border">
            {recent!.map((s: any) => (
              <li key={s.id} className="px-4 py-2 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{s.assignment?.title ?? "—"}</div>
                  <div className="text-[10px] text-fg-muted">
                    {s.user?.display_name || s.user?.username} · 給 {s.score}/{s.assignment?.max_score} 分 · {formatTW(s.graded_at)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "accent" }) {
  const color = tone === "accent" ? "text-accent" : "text-fg";
  return (
    <div className="rounded-xl bg-bg-card border border-border p-4">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{typeof value === "number" ? value.toLocaleString() : value}</div>
    </div>
  );
}
