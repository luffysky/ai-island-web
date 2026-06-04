import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServer } from "@/lib/supabase-server";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";
import { DashboardCharts } from "./DashboardCharts";
import { AutoRefresh } from "./AutoRefresh";
import { NotifyTestButton } from "./NotifyTestButton";
import { checkOwner } from "@/lib/is-owner";

export default async function AdminOverviewPage() {
  const supabase = createSupabaseAdmin();

  // 拿當前 user 做 owner identity check (給 dashboard 顯示)
  const serverSb = await createSupabaseServer();
  const { data: { user: currentUser } } = await serverSb.auth.getUser();
  const { data: currentProfile } = currentUser ? await supabase
    .from("profiles")
    .select("username, role")
    .eq("id", currentUser.id)
    .maybeSingle() : { data: null };
  const ownerCheck = currentUser ? checkOwner({
    id: currentUser.id,
    username: (currentProfile as any)?.username ?? null,
    role: (currentProfile as any)?.role ?? null,
    email: currentUser.email ?? null,
  }) : null;

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400_000).toISOString();
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

  // === 趨勢比較 (本週 vs 上週、找 trend arrow 用) ===
  const [
    { count: usersThisWeek },
    { count: usersLastWeek },
    { data: revenue14d },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo),
    supabase.from("orders").select("amount, status, created_at").gte("created_at", fourteenDaysAgo).eq("status", "paid"),
  ] as any);

  const rev14d = (revenue14d as any[]) ?? [];
  const revThisWeek = rev14d.filter((o) => o.created_at >= sevenDaysAgo).reduce((s, o) => s + Number(o.amount), 0);
  const revLastWeek = rev14d.filter((o) => o.created_at < sevenDaysAgo).reduce((s, o) => s + Number(o.amount), 0);

  // 算 trend %
  const calcTrend = (cur: number, prev: number): { pct: number; dir: "up" | "down" | "flat" } => {
    if (prev === 0) return { pct: cur > 0 ? 100 : 0, dir: cur > 0 ? "up" : "flat" };
    const pct = ((cur - prev) / prev) * 100;
    return { pct, dir: pct > 1 ? "up" : pct < -1 ? "down" : "flat" };
  };

  const userTrend = calcTrend(usersThisWeek ?? 0, usersLastWeek ?? 0);
  const revTrend = calcTrend(revThisWeek, revLastWeek);

  // === 行銷數據 (新) === — 用 try-catch 包、某張表不存在不要整頁炸
  let utmStats: any[] = [];
  let emailSubs = 0, marketingDrafts = 0, activeAffiliates = 0;
  try {
    const r = await supabase.from("utm_links").select("click_count, conversion, revenue").is("archived_at", null);
    utmStats = (r.data as any[]) ?? [];
  } catch {}
  try {
    const r = await supabase.from("email_subscribers").select("*", { count: "exact", head: true });
    emailSubs = r.count ?? 0;
  } catch {}
  try {
    const r = await supabase.from("marketing_drafts").select("*", { count: "exact", head: true }).in("status", ["draft", "scheduled"]);
    marketingDrafts = r.count ?? 0;
  } catch {}
  try {
    const r = await supabase.from("affiliate_codes").select("*", { count: "exact", head: true }).eq("enabled", true);
    activeAffiliates = r.count ?? 0;
  } catch {}

  const utmRows = utmStats;
  const totalUtmClicks = utmRows.reduce((s, r) => s + (r.click_count ?? 0), 0);
  const totalUtmRevenue = utmRows.reduce((s, r) => s + Number(r.revenue ?? 0), 0);

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

  // === 即時在線（站內 tracker、近 5 分鐘 last_seen_at、去重 by user_id / visitor_id）===
  const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: liveSessions } = await supabase
    .from("analytics_sessions")
    .select("user_id, visitor_id, current_path")
    .gte("last_seen_at", fiveMinAgo);
  // 同 user 多 device 算 1 個（電腦 + 手機同登 = 1）
  const liveMembers = new Set(
    (liveSessions ?? []).filter((s: any) => s.user_id).map((s: any) => s.user_id)
  ).size;
  const liveGuests = new Set(
    (liveSessions ?? []).filter((s: any) => !s.user_id).map((s: any) => s.visitor_id)
  ).size;
  const liveTotal = liveMembers + liveGuests;
  const liveSessionCount = liveSessions?.length ?? 0;

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
    .select("provider, enabled, monthly_budget_usd, used_this_month_usd, reset_date:reset_at")
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
      {/* Auto-refresh + 通知測試 控制列 */}
      <div className="flex justify-end items-start gap-3 flex-wrap">
        <NotifyTestButton />
        <AutoRefresh />
      </div>

      {/* Owner identity card — 顯示 AI 為什麼判你 owner */}
      {ownerCheck?.isOwner && (
        <div className="bg-gradient-to-r from-yellow-500/10 via-pink-500/10 to-purple-500/10 border border-yellow-500/30 rounded-2xl p-4">
          <div className="flex items-start gap-3 flex-wrap">
            <span className="text-2xl">👑</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm flex items-center gap-2 flex-wrap">
                Owner 身份識別已生效
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-900 dark:text-yellow-100 border border-yellow-500/30">
                  {ownerCheck.signals.role && "role"}
                  {ownerCheck.signals.username && " · username"}
                  {ownerCheck.signals.email && " · email"}
                  {ownerCheck.signals.userId && " · userId"}
                </span>
              </div>
              <p className="text-[11px] text-fg-muted mt-1 leading-relaxed">
                AI 判 owner 用 5 個 signal 任一命中 (role / username / userId / email / LINE role)。當前你命中：
              </p>
              <ul className="text-[11px] text-fg-muted mt-1 space-y-0.5">
                {ownerCheck.reasons.map((r, i) => (
                  <li key={i} className="font-mono">✓ {r}</li>
                ))}
                {ownerCheck.reasons.length === 0 && <li className="text-orange-400">⚠️ 沒命中任何 signal、但 owner=true (代表 caller 強制傳了)</li>}
              </ul>
              <details className="mt-2 text-[10px]">
                <summary className="cursor-pointer text-fg-muted hover:text-fg">所有 signal 狀態</summary>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1 mt-2 font-mono">
                  <span className={ownerCheck.signals.role ? "text-emerald-400" : "text-fg-muted/50"}>{ownerCheck.signals.role ? "✓" : "·"} role = owner</span>
                  <span className={ownerCheck.signals.username ? "text-emerald-400" : "text-fg-muted/50"}>{ownerCheck.signals.username ? "✓" : "·"} username 在白名單</span>
                  <span className={ownerCheck.signals.userId ? "text-emerald-400" : "text-fg-muted/50"}>{ownerCheck.signals.userId ? "✓" : "·"} userId 在 OWNER_USER_IDS</span>
                  <span className={ownerCheck.signals.email ? "text-emerald-400" : "text-fg-muted/50"}>{ownerCheck.signals.email ? "✓" : "·"} email 在 OWNER_EMAILS</span>
                  <span className={ownerCheck.signals.lineRole ? "text-emerald-400" : "text-fg-muted/50"}>{ownerCheck.signals.lineRole ? "✓" : "·"} LINE role 含「董事」</span>
                </div>
                <p className="mt-2 text-fg-muted/70">
                  env 可調：<code className="text-purple-300">OWNER_USERNAMES</code>、<code className="text-purple-300">OWNER_USER_IDS</code>、<code className="text-purple-300">OWNER_EMAILS</code> (逗號分隔)。
                  沒設也有預設 (username startsWith luffysky00 / email luffysky00@gmail.com)。
                </p>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* 即時 4 widget grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* 即時在線 */}
        <Link href={adminHref("/admin/ga4") as any} className="bg-bg-card border border-border rounded-xl p-4 hover:border-accent transition">
          <div className="text-[10px] uppercase tracking-wider text-fg-muted flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            即時在線
          </div>
          <div className="text-2xl font-bold mt-1 text-green-400">{liveTotal}</div>
          <div className="text-[10px] text-fg-muted mt-1">
            {liveMembers} 會員 / {liveGuests} 訪客
          </div>
          {liveSessionCount > liveTotal && (
            <div className="text-[9px] text-fg-muted/70 mt-0.5">
              session {liveSessionCount}（多裝置已去重）
            </div>
          )}
        </Link>

        {/* 即將逾期 breach */}
        <Link href={adminHref("/admin/breach") as any} className={`bg-bg-card border rounded-xl p-4 transition ${overdueBreaches.length > 0 ? "border-red-500/40 hover:border-red-500" : "border-border hover:border-accent"}`}>
          <div className="text-[10px] uppercase tracking-wider text-fg-muted">
            {overdueBreaches.length > 0 ? "⚠ 即將/已逾期 breach" : "✅ 無 breach 風險"}
          </div>
          <div className={`text-2xl font-bold mt-1 ${overdueBreaches.length > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {overdueBreaches.length}
          </div>
          <div className="text-[10px] text-fg-muted mt-1">
            {overdueBreaches.length > 0
              ? `最久 ${Math.round(overdueBreaches[0].hoursSinceDiscovered)}h`
              : "近 72h 內無未通報事件"}
          </div>
        </Link>

        {/* 近期 audit */}
        <Link href={adminHref("/admin/audit") as any} className="bg-bg-card border border-border rounded-xl p-4 hover:border-accent transition">
          <div className="text-[10px] uppercase tracking-wider text-fg-muted">近期 audit</div>
          {recentAudit && recentAudit.length > 0 ? (
            <>
              <div className="text-sm font-bold mt-1 truncate">{recentAudit[0].actor_username}</div>
              <div className="text-[10px] text-fg-muted truncate font-mono">{recentAudit[0].action}</div>
              <div className="text-[10px] text-fg-muted mt-0.5">
                {recentAudit.length} 筆於 ↗
              </div>
            </>
          ) : (
            <div className="text-2xl font-bold mt-1 text-fg-muted">—</div>
          )}
        </Link>

        {/* AI 預算 */}
        <Link href={adminHref("/admin/ai/models") as any} className={`bg-bg-card border rounded-xl p-4 transition ${budgetView.some((b: any) => b.level === "critical") ? "border-red-500/40" : budgetView.some((b: any) => b.level === "warning") ? "border-orange-500/40" : "border-border hover:border-accent"}`}>
          <div className="text-[10px] uppercase tracking-wider text-fg-muted">AI 預算</div>
          <div className="text-sm font-bold mt-1">
            {budgetView.length === 0 ? "—" : `${budgetView.length} 把 key`}
          </div>
          <div className="mt-1 space-y-0.5">
            {budgetView.slice(0, 3).map((b: any) => (
              <div key={b.provider} className="flex items-center gap-1.5">
                <div className="flex-1 h-1 bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className={`h-full ${b.level === "critical" ? "bg-red-500" : b.level === "warning" ? "bg-orange-400" : "bg-emerald-400"}`}
                    style={{ width: `${b.pct}%` }}
                  />
                </div>
                <span className="text-[9px] text-fg-muted w-12 text-right">
                  {b.pct}%
                </span>
              </div>
            ))}
          </div>
        </Link>
      </div>

      {/* 核心指標 */}
      <div>
        <h2 className="text-sm uppercase tracking-wider text-fg-muted mb-3">核心指標</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="總用戶" value={userCount ?? 0} hint={`+${newUsersThisMonth ?? 0} 本月`} color="text-accent" trend={userTrend} />
          <Stat label="今日新註冊" value={newUsersToday ?? 0} color="text-blue-400" hint={`本週 ${usersThisWeek ?? 0}`} />
          <Stat label="近 7 日活躍" value={dauCount ?? 0} hint={`${userCount ? Math.round((dauCount ?? 0) / userCount * 100) : 0}% 整體留存`} color="text-green-400" />
          <Stat label="MRR" value={`NT$ ${mrr.toLocaleString()}`} hint={`${activeSubs ?? 0} 訂閱、本週收入 NT$ ${revThisWeek.toLocaleString()}`} color="text-yellow-400" trend={revTrend} />
        </div>
      </div>

      {/* 📣 行銷快覽 (新) */}
      <div>
        <h2 className="text-sm uppercase tracking-wider text-fg-muted mb-3 flex items-center gap-2">
          📣 行銷快覽
          <Link href={adminHref("/admin/marketing") as any} className="text-[10px] text-accent hover:underline">→ 主控台</Link>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="行銷草稿" value={marketingDrafts ?? 0} hint="待發佈 / 排程" color="text-pink-400" />
          <Stat label="UTM 累積點擊" value={totalUtmClicks.toLocaleString()} hint={`${utmRows.length} 條短連結`} color="text-purple-400" />
          <Stat label="UTM 帶來營收" value={`NT$ ${totalUtmRevenue.toLocaleString()}`} hint="所有 campaign 累計" color="text-emerald-400" />
          <Stat label="Email 訂閱戶" value={(emailSubs ?? 0).toLocaleString()} hint={`${activeAffiliates ?? 0} 個有效推薦碼`} color="text-cyan-400" />
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
        <h2 className="text-sm uppercase tracking-wider text-fg-muted mb-3">學習 / 商務 / 客服</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="完成 lessons" value={lessonCount ?? 0} color="text-accent-2" />
          <Stat label="Quiz 嘗試" value={quizCount ?? 0} color="text-purple-400" />
          <Stat label="本月訂單" value={ordersThisMonth ?? 0} color="text-cyan-400" />
          <Stat label="待處理客服" value={openTickets ?? 0} color="text-red-400" />
        </div>
      </div>

      {/* 快速操作 */}
      <div className="bg-bg-card border border-border rounded-xl p-5">
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
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <h2 className="font-bold mb-3">🏆 Top 10 玩家</h2>
          <div className="space-y-1.5">
            {topUsers?.map((u: any, i: number) => (
              <Link href={adminHref(`/admin/users?q=${u.username}`) as any} key={u.username} className="flex items-center justify-between text-sm py-1 hover:text-accent">
                <span><span className="text-fg-muted mr-2">#{i + 1}</span>{u.username}</span>
                <span><span className="text-accent">Lv {u.level}</span> <span className="text-fg-muted ml-2">{u.xp} XP</span></span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-5">
          <h2 className="font-bold mb-3">🆕 最近註冊</h2>
          <div className="space-y-1.5">
            {recentSignups?.map((u: any) => (
              <Link href={adminHref(`/admin/users?q=${u.username}`) as any} key={u.username} className="flex items-center justify-between text-sm py-1 hover:text-accent">
                <span>{u.username}</span>
                <span className="text-fg-muted text-xs">{new Date(u.created_at).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label, value, hint, color, trend,
}: {
  label: string;
  value: any;
  hint?: string;
  color: string;
  trend?: { pct: number; dir: "up" | "down" | "flat" };
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 hover:border-accent/40 transition relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-accent/[0.03] opacity-0 group-hover:opacity-100 transition" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="text-xs text-fg-muted">{label}</div>
          {trend && trend.dir !== "flat" && (
            <span className={`text-[10px] font-bold inline-flex items-center gap-0.5 ${
              trend.dir === "up" ? "text-emerald-400" : "text-red-400"
            }`}>
              {trend.dir === "up" ? "▲" : "▼"} {Math.abs(trend.pct).toFixed(1)}%
            </span>
          )}
        </div>
        <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
        {hint && <div className="text-[11px] text-fg-muted mt-1 leading-tight">{hint}</div>}
      </div>
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link href={adminHref(href) as any} className="px-3 py-2 bg-bg-elevated rounded-lg hover:bg-border hover:text-accent text-center transition">
      {label}
    </Link>
  );
}
