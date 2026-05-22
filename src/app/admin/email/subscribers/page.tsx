import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function SubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const type = sp.type || "all";
  const status = sp.status || "all";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const off = (page - 1) * PAGE_SIZE;

  const supabase = createSupabaseAdmin();

  let query = supabase.from("email_subscriptions").select("*", { count: "exact" });
  if (q) {
    query = query.ilike("email", `%${q.replace(/[%,*()\\]/g, "")}%`);
  }
  if (type !== "all") query = query.eq(type, true);
  if (status === "subscribed") query = query.is("unsubscribed_at", null);
  if (status === "unsubscribed") query = query.not("unsubscribed_at", "is", null);

  const { data: subs, count, error } = await query
    .order("created_at", { ascending: false })
    .range(off, off + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  // Reason aggregate
  const { data: reasonRows } = await supabase
    .from("email_subscriptions")
    .select("unsubscribe_reason")
    .not("unsubscribed_at", "is", null)
    .limit(2000);
  const reasonCounts = new Map<string, number>();
  for (const r of reasonRows ?? []) {
    const k = (r as any).unsubscribe_reason || "(未填)";
    reasonCounts.set(k, (reasonCounts.get(k) ?? 0) + 1);
  }
  const topReasons = Array.from(reasonCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Total split
  const { count: totalActive } = await supabase
    .from("email_subscriptions")
    .select("*", { count: "exact", head: true })
    .is("unsubscribed_at", null);
  const { count: totalUnsub } = await supabase
    .from("email_subscriptions")
    .select("*", { count: "exact", head: true })
    .not("unsubscribed_at", "is", null);

  function maskEmail(e: string) {
    const at = e.indexOf("@");
    if (at < 2) return e;
    return e.slice(0, 2) + "***" + e.slice(at);
  }

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { q, type, status, page: String(page), ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "all" && !(k === "page" && v === "1")) params.set(k, v);
    }
    return adminHref("/admin/email/subscribers" + (params.toString() ? "?" + params.toString() : ""));
  };

  if (error?.message?.includes("does not exist")) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
        <div className="font-bold mb-2">⚠️ 需要先跑 migration</div>
        <code className="block bg-[var(--color-bg)] p-3 rounded text-xs">supabase/breach_and_email_migration.sql</code>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">📧 Email 訂閱戶</h2>
        <div className="text-xs text-[var(--color-fg-muted)]">
          匹配 {(count ?? 0).toLocaleString()} 筆 · 第 {page}/{totalPages} 頁
        </div>
      </div>

      {/* 概覽 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-fg-muted)]">總訂閱數</div>
          <div className="text-xl font-bold mt-0.5">{((totalActive ?? 0) + (totalUnsub ?? 0)).toLocaleString()}</div>
        </div>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-fg-muted)]">在訂閱</div>
          <div className="text-xl font-bold mt-0.5 text-emerald-500">{(totalActive ?? 0).toLocaleString()}</div>
        </div>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-fg-muted)]">已退訂</div>
          <div className="text-xl font-bold mt-0.5 text-orange-500">
            {(totalUnsub ?? 0).toLocaleString()}
            {(totalActive ?? 0) + (totalUnsub ?? 0) > 0 && (
              <span className="text-[10px] text-[var(--color-fg-muted)] ml-1">
                ({(((totalUnsub ?? 0) / ((totalActive ?? 0) + (totalUnsub ?? 0))) * 100).toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {topReasons.length > 0 && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
          <h3 className="text-sm font-bold mb-2">退訂原因 Top 5</h3>
          <ul className="space-y-1 text-xs">
            {topReasons.map(([reason, n]) => (
              <li key={reason} className="flex items-center gap-2">
                <span className="flex-1 truncate">{reason}</span>
                <span className="text-[var(--color-fg-muted)]">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form action={adminHref("/admin/email/subscribers")} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3 flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="🔍 搜尋 email"
          className="flex-1 min-w-[200px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm"
        />
        <select
          name="type"
          defaultValue={type}
          className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-sm"
        >
          <option value="all">所有類型</option>
          <option value="newsletter">📰 newsletter</option>
          <option value="product_updates">🎁 product_updates</option>
          <option value="course_announcements">📚 course_announcements</option>
          <option value="weekly_digest">📅 weekly_digest</option>
        </select>
        <select
          name="status"
          defaultValue={status}
          className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-sm"
        >
          <option value="all">全部</option>
          <option value="subscribed">在訂閱</option>
          <option value="unsubscribed">已退訂</option>
        </select>
        <button type="submit" className="px-4 py-1.5 text-sm rounded-lg bg-[var(--color-accent)] text-black font-bold">
          套用
        </button>
      </form>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-elevated)] text-left text-xs text-[var(--color-fg-muted)] uppercase">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">訂閱中</th>
              <th className="px-4 py-3">上次寄信</th>
              <th className="px-4 py-3">退訂</th>
              <th className="px-4 py-3">原因</th>
              <th className="px-4 py-3">註冊</th>
            </tr>
          </thead>
          <tbody>
            {subs?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[var(--color-fg-muted)]">
                  目前條件下沒有訂閱戶
                </td>
              </tr>
            ) : (
              subs?.map((s: any) => (
                <tr key={s.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)]">
                  <td className="px-4 py-2 text-xs font-mono" title={s.email}>{maskEmail(s.email)}</td>
                  <td className="px-4 py-2 text-xs">
                    {s.newsletter && "📰 "}
                    {s.product_updates && "🎁 "}
                    {s.course_announcements && "📚 "}
                    {s.weekly_digest && "📅 "}
                    {!(s.newsletter || s.product_updates || s.course_announcements || s.weekly_digest) && "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-[var(--color-fg-muted)]">
                    {s.last_email_at ? new Date(s.last_email_at).toLocaleDateString("zh-TW") : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {s.unsubscribed_at
                      ? <span className="text-orange-500">{new Date(s.unsubscribed_at).toLocaleDateString("zh-TW")}</span>
                      : <span className="text-emerald-500">在訂閱</span>}
                  </td>
                  <td className="px-4 py-2 text-xs text-[var(--color-fg-muted)] truncate max-w-[200px]" title={s.unsubscribe_reason}>
                    {s.unsubscribe_reason || ""}
                  </td>
                  <td className="px-4 py-2 text-xs text-[var(--color-fg-muted)]">
                    {new Date(s.created_at).toLocaleDateString("zh-TW")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Link href={page > 1 ? (buildHref({ page: String(page - 1) }) as any) : "#"} className={`px-3 py-1.5 rounded-lg border border-[var(--color-border)] ${page <= 1 ? "opacity-40 pointer-events-none" : "hover:bg-[var(--color-bg-elevated)]"}`}>
            ← 上一頁
          </Link>
          <span className="text-xs text-[var(--color-fg-muted)] px-3">{page} / {totalPages}</span>
          <Link href={page < totalPages ? (buildHref({ page: String(page + 1) }) as any) : "#"} className={`px-3 py-1.5 rounded-lg border border-[var(--color-border)] ${page >= totalPages ? "opacity-40 pointer-events-none" : "hover:bg-[var(--color-bg-elevated)]"}`}>
            下一頁 →
          </Link>
        </div>
      )}
    </div>
  );
}
