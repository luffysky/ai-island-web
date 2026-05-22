import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";
import { DashboardCharts } from "./DashboardCharts";

export default async function AdminOverviewPage() {
  const supabase = createSupabaseAdmin();

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
  const thirtyDaysAgoStr = thirtyDaysAgo.slice(0, 10);

  const [
    { count: userCount },
    { count: newUsersToday },
    { count: newUsersThisMonth },
    { count: dauCount },
    { count: lessonCount },
    { count: quizCount },
    { data: topUsers },
    { data: recentSignups },
    { count: ordersThisMonth },
    { count: activeSubs },
    { count: openTickets },
    { data: aiUsage30d },
    { data: signupTrend },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", startOfToday),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_at", sevenDaysAgo),
    supabase.from("lesson_progress").select("*", { count: "exact", head: true }),
    supabase.from("quiz_attempts").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("username, xp, level, streak_days").order("xp", { ascending: false }).limit(10),
    supabase.from("profiles").select("username, created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("orders").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth).eq("status", "paid").maybeSingle(),
    supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active").maybeSingle(),
    supabase.from("tickets").select("*", { count: "exact", head: true }).eq("status", "open").maybeSingle(),
    supabase.from("ai_usage_daily").select("date, cost_usd, message_count").gte("date", thirtyDaysAgoStr).order("date").maybeSingle().then((r: any) => ({ data: Array.isArray(r.data) ? r.data : [] })),
    supabase.from("profiles").select("created_at").gte("created_at", thirtyDaysAgo).order("created_at"),
  ] as any);

  // 計算 MRR
  const { data: subs } = await supabase.from("subscriptions").select("plan_price").eq("status", "active");
  const mrr = subs?.reduce((sum: number, s: any) => sum + (s.plan_price ?? 0), 0) ?? 0;

  // 註冊趨勢（按日）
  const signupByDate: Record<string, number> = {};
  (signupTrend ?? []).forEach((u: any) => {
    const date = u.created_at.slice(0, 10);
    signupByDate[date] = (signupByDate[date] ?? 0) + 1;
  });

  // 補滿 30 天（沒註冊的也要顯示 0）
  const signupChartData: any[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    signupChartData.push({ date: d.slice(5), count: signupByDate[d] ?? 0 });
  }

  // AI 使用量趨勢
  const aiByDate: Record<string, { cost: number; calls: number }> = {};
  (aiUsage30d ?? []).forEach((u: any) => {
    if (!aiByDate[u.date]) aiByDate[u.date] = { cost: 0, calls: 0 };
    aiByDate[u.date].cost += Number(u.cost_usd);
    aiByDate[u.date].calls += u.message_count;
  });
  const aiChartData = Object.entries(aiByDate).map(([date, v]) => ({
    date: date.slice(5),
    cost: Number(v.cost.toFixed(4)),
    calls: v.calls,
  }));

  // === 收入趨勢（近 30 天）===
  const { data: orders30d } = await supabase
    .from("orders")
    .select("amount, status, created_at")
    .gte("created_at", thirtyDaysAgo);

  const revenueByDate: Record<string, { revenue: number; refund: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    revenueByDate[d] = { revenue: 0, refund: 0 };
  }
  (orders30d ?? []).forEach((o: any) => {
    const d = o.created_at.slice(0, 10);
    if (!revenueByDate[d]) revenueByDate[d] = { revenue: 0, refund: 0 };
    if (o.status === "paid") revenueByDate[d].revenue += o.amount;
    else if (o.status === "refunded") revenueByDate[d].refund += o.amount;
  });
  const revenueChartData = Object.entries(revenueByDate).map(([date, v]) => ({
    date: date.slice(5), revenue: v.revenue, refund: v.refund,
  }));

  // === 章節完成 Top 10 ===
  const { data: progressData } = await supabase
    .from("lesson_progress")
    .select("chapter_id");
  const chapterCompletion: Record<number, number> = {};
  (progressData ?? []).forEach((p: any) => {
    chapterCompletion[p.chapter_id] = (chapterCompletion[p.chapter_id] ?? 0) + 1;
  });
  const lessonCompletionData = Object.entries(chapterCompletion)
    .map(([cid, count]) => ({ chapter: `Ch${String(cid).padStart(2, "0")}`, completed: count, total: 0 }))
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 10);

  // === 每小時活躍（用今天 last_active_at 推估）===
  const { data: activeUsers } = await supabase
    .from("profiles")
    .select("last_active_at")
    .gte("last_active_at", sevenDaysAgo);
  const hourlyMap: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourlyMap[h] = 0;
  (activeUsers ?? []).forEach((u: any) => {
    if (u.last_active_at) {
      const h = new Date(u.last_active_at).getHours();
      hourlyMap[h] = (hourlyMap[h] ?? 0) + 1;
    }
  });
  const hourlyActivityData = Object.entries(hourlyMap).map(([h, users]) => ({ hour: Number(h), users }));

  // === 即時在線（站內 tracker、近 5 分鐘 last_seen_at）===
  const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: liveSessions } = await supabase
    .from("analytics_sessions")
    .select("user_id, current_path")
    .gte("last_seen_at", fiveMinAgo);
  const liveTotal = liveSessions?.length ?? 0;
  const liveMembers = liveSessions?.filter((s: any) => s.user_id).length ?? 0;
  const liveGuests = liveTotal - liveMembers;

  // === 即將逾期 breach（urgent + 未通報）===
  const { data: urgentBreaches } = await supabase
    .from("breach_incidents")
    .select("id, incident_type, severity, discovered_at, affected_user_count, status, reported_to_authority")
    .eq("reported_to_authority", false)
    .neq("status", "resolved")
    .order("discovered_at", { ascending: true })
    .limit(5);
  const overdueBreaches = (urgentBreaches ?? []).map((b: any) => {
    const hours = (Date.now() - new Date(b.discovered_at).getTime()) / 3600_000;
    return { ...b, hoursSinceDiscovered: hours, isOverdue: hours >= 72, isUrgent: hours >= 48 };
  }).filter((b: any) => b.isUrgent);

  // === 近 5 筆 audit log ===
  const { data: recentAudit } = await supabase
    .from("audit_logs")
    .select("id, created_at, actor_username, action, target_type")
    .order("created_at", { ascending: false })
    .limit(5);

  // === AI 預算進度（enabled keys 各一條進度條）===
  const { data: aiKeys } = await supabase
    .from("ai_api_keys")
    .select("provider, enabled, monthly_budget_usd, used_this_month_usd, reset_date")
    .eq("enabled", true);
  const budgetView = (aiKeys ?? []).map((k: any) => {
    const used = Number(k.used_this_month_usd ?? 0);
    const budget = Number(k.monthly_budget_usd ?? 0);
    const pct = budget > 0 ? Math.min(100, (used / budget) * 100) : 0;
    return {
      provider: k.provider,
      used: used.toFixed(2),
      budget: budget.toFixed(2),
      pct: pct.toFixed(1),
      level: pct >= 100 ? "critical" : pct >= 80 ? "warning" : "ok",
    };
  });

  return (
    <div className="space-y-6">
      {/* 即時 4 widget grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* 即時在線 */}
        <Link href={adminHref("/admin/ga4") as any} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-accent)] transition">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-fg-muted)] flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            即時在線
          </div>
          <div className="text-2xl font-bold mt-1 text-green-400">{liveTotal}</div>
          <div className="text-[10px] text-[var(--color-fg-muted)] mt-1">
            {liveMembers} 會員 / {liveGuests} 訪客
          </div>
        </Link>

        {/* 即將逾期 breach */}
        <Link href={adminHref("/admin/breach") as any} className={`bg-[var(--color-bg-card)] border rounded-xl p-4 transition ${overdueBreaches.length > 0 ? "border-red-500/40 hover:border-red-500" : "border-[var(--color-border)] hover:border-[var(--color-accent)]"}`}>
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-fg-muted)]">
            {overdueBreaches.length > 0 ? "⚠ 即將/已逾期 breach" : "✅ 無 breach 風險"}
          </div>
          <div className={`text-2xl font-bold mt-1 ${overdueBreaches.length > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {overdueBreaches.length}
          </div>
          <div className="text-[10px] text-[var(--color-fg-muted)] mt-1">
            {overdueBreaches.length > 0
              ? `最久 ${Math.round(overdueBreaches[0].hoursSinceDiscovered)}h`
              : "近 72h 內無未通報事件"}
          </div>
        </Link>

        {/* 近期 audit */}
        <Link href={adminHref("/admin/audit") as any} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-accent)] transition">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-fg-muted)]">近期 audit</div>
          {recentAudit && recentAudit.length > 0 ? (
            <>
              <div className="text-sm font-bold mt-1 truncate">{recentAudit[0].actor_username}</div>
              <div className="text-[10px] text-[var(--color-fg-muted)] truncate font-mono">{recentAudit[0].action}</div>
              <div className="text-[10px] text-[var(--color-fg-muted)] mt-0.5">
                {recentAudit.length} 筆於 ↗
              </div>
            </>
          ) : (
            <div className="text-2xl font-bold mt-1 text-[var(--color-fg-muted)]">—</div>
          )}
        </Link>

        {/* AI 預算 */}
        <Link href={adminHref("/admin/ai/models") as any} className={`bg-[var(--color-bg-card)] border rounded-xl p-4 transition ${budgetView.some((b: any) => b.level === "critical") ? "border-red-500/40" : budgetView.some((b: any) => b.level === "warning") ? "border-orange-500/40" : "border-[var(--color-border)] hover:border-[var(--color-accent)]"}`}>
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-fg-muted)]">AI 預算</div>
          <div className="text-sm font-bold mt-1">
            {budgetView.length === 0 ? "—" : `${budgetView.length} 把 key`}
          </div>
          <div className="mt-1 space-y-0.5">
            {budgetView.slice(0, 3).map((b: any) => (
              <div key={b.provider} className="flex items-center gap-1.5">
                <div className="flex-1 h-1 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${b.level === "critical" ? "bg-red-500" : b.level === "warning" ? "bg-orange-400" : "bg-emerald-400"}`}
                    style={{ width: `${b.pct}%` }}
                  />
                </div>
                <span className="text-[9px] text-[var(--color-fg-muted)] w-12 text-right">
                  {b.pct}%
                </span>
              </div>
            ))}
          </div>
        </Link>
      </div>

      {/* 核心指標 */}
      <div>
        <h2 className="text-sm uppercase tracking-wider text-[var(--color-fg-muted)] mb-3">核心指標</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="總用戶" value={userCount ?? 0} hint={`+${newUsersThisMonth ?? 0} 本月`} color="text-[var(--color-accent)]" />
          <Stat label="今日新註冊" value={newUsersToday ?? 0} color="text-blue-400" />
          <Stat label="近 7 日活躍" value={dauCount ?? 0} hint={`${userCount ? Math.round((dauCount ?? 0) / userCount * 100) : 0}% retention`} color="text-green-400" />
          <Stat label="MRR" value={`NT$ ${mrr.toLocaleString()}`} hint={`${activeSubs ?? 0} 訂閱`} color="text-yellow-400" />
        </div>
      </div>

      {/* 圖表 */}
      <DashboardCharts
        signupData={signupChartData}
        aiData={aiChartData}
        revenueData={revenueChartData}
        lessonCompletionData={lessonCompletionData}
        hourlyActivityData={hourlyActivityData}
      />

      {/* 第二排 */}
      <div>
        <h2 className="text-sm uppercase tracking-wider text-[var(--color-fg-muted)] mb-3">學習 / 商務 / 客服</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="完成 lessons" value={lessonCount ?? 0} color="text-[var(--color-accent-2)]" />
          <Stat label="Quiz 嘗試" value={quizCount ?? 0} color="text-purple-400" />
          <Stat label="本月訂單" value={ordersThisMonth ?? 0} color="text-cyan-400" />
          <Stat label="待處理客服" value={openTickets ?? 0} color="text-red-400" />
        </div>
      </div>

      {/* 快速操作 */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="font-bold mb-3">⚡ 快速操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
          <QuickAction href="/admin/broadcasts" label="📣 發公告" />
          <QuickAction href="/admin/users" label="👥 找用戶" />
          <QuickAction href="/admin/orders" label="💰 訂單" />
          <QuickAction href="/admin/crm" label="💬 客服" />
          <QuickAction href="/admin/ai/models" label="🤖 AI 模型" />
          <QuickAction href="/admin/seo" label="🔍 SEO" />
        </div>
      </div>

      {/* 雙欄 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h2 className="font-bold mb-3">🏆 Top 10 玩家</h2>
          <div className="space-y-1.5">
            {topUsers?.map((u: any, i: number) => (
              <Link href={adminHref(`/admin/users?q=${u.username}`) as any} key={u.username} className="flex items-center justify-between text-sm py-1 hover:text-[var(--color-accent)]">
                <span><span className="text-[var(--color-fg-muted)] mr-2">#{i + 1}</span>{u.username}</span>
                <span><span className="text-[var(--color-accent)]">Lv {u.level}</span> <span className="text-[var(--color-fg-muted)] ml-2">{u.xp} XP</span></span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h2 className="font-bold mb-3">🆕 最近註冊</h2>
          <div className="space-y-1.5">
            {recentSignups?.map((u: any) => (
              <Link href={adminHref(`/admin/users?q=${u.username}`) as any} key={u.username} className="flex items-center justify-between text-sm py-1 hover:text-[var(--color-accent)]">
                <span>{u.username}</span>
                <span className="text-[var(--color-fg-muted)] text-xs">{new Date(u.created_at).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint, color }: { label: string; value: any; hint?: string; color: string }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="text-xs text-[var(--color-fg-muted)]">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
      {hint && <div className="text-xs text-[var(--color-fg-muted)] mt-1">{hint}</div>}
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link href={adminHref(href) as any} className="px-3 py-2 bg-[var(--color-bg-elevated)] rounded-lg hover:bg-[var(--color-border)] hover:text-[var(--color-accent)] text-center transition">
      {label}
    </Link>
  );
}
