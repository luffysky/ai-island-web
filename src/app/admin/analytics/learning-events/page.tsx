import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function LearningEventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    event_type?: string;
    chapter_id?: string;
    user?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000);
  const from = sp.from || sevenDaysAgo.toISOString().slice(0, 10);
  const to = sp.to || new Date().toISOString().slice(0, 10);
  const eventType = sp.event_type || "all";
  const chapterId = sp.chapter_id || "all";
  const userSearch = sp.user || "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const off = (page - 1) * PAGE_SIZE;

  const supabase = createSupabaseAdmin();

  const { data: distinctTypesRaw } = await supabase
    .from("learning_events")
    .select("event_type")
    .limit(2000);
  const distinctTypes = Array.from(
    new Set((distinctTypesRaw ?? []).map((r: any) => r.event_type)),
  ).filter(Boolean).sort() as string[];

  // resolve user search → user_id
  let resolvedUserId: string | null = null;
  if (userSearch) {
    const { data: u } = await supabase
      .from("profiles")
      .select("id")
      .or(`username.ilike.%${userSearch.replace(/[%,]/g, "")}%,display_name.ilike.%${userSearch.replace(/[%,]/g, "")}%`)
      .limit(1)
      .maybeSingle();
    resolvedUserId = u?.id ?? "__no_match__";
  }

  let q = supabase
    .from("learning_events")
    .select("*", { count: "exact" })
    .gte("created_at", `${from}T00:00:00`)
    .lte("created_at", `${to}T23:59:59`);
  if (eventType !== "all") q = q.eq("event_type", eventType);
  if (chapterId !== "all") q = q.eq("chapter_id", Number(chapterId));
  if (resolvedUserId) q = q.eq("user_id", resolvedUserId);

  const { data: events, count, error } = await q
    .order("created_at", { ascending: false })
    .range(off, off + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  // 撈對應 user 名稱
  const userIds = Array.from(new Set((events ?? []).map((e: any) => e.user_id))).filter(Boolean);
  const { data: profileRows } = userIds.length
    ? await supabase.from("profiles").select("id, username, display_name").in("id", userIds)
    : { data: [] };
  const userMap = new Map<string, any>();
  (profileRows ?? []).forEach((p: any) => userMap.set(p.id, p));

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { from, to, event_type: eventType, chapter_id: chapterId, user: userSearch, page: String(page), ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "all" && !(k === "page" && v === "1")) params.set(k, v);
    }
    return adminHref("/admin/analytics/learning-events" + (params.toString() ? "?" + params.toString() : ""));
  };

  const exportParams = new URLSearchParams();
  exportParams.set("from", `${from}T00:00:00.000Z`);
  exportParams.set("to", `${to}T23:59:59.999Z`);
  if (eventType !== "all") exportParams.set("event_type", eventType);
  if (chapterId !== "all") exportParams.set("chapter_id", chapterId);
  if (resolvedUserId && resolvedUserId !== "__no_match__") exportParams.set("user_id", resolvedUserId);

  if (error?.message?.includes("does not exist")) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
        <div className="font-bold mb-2">⚠️ learning_events table 不存在</div>
        <p className="text-xs text-fg-muted">需先建表（schema.sql 應有）</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">📊 學習行為事件</h2>
          <p className="text-xs text-fg-muted mt-0.5">
            站內 lesson 完成 / quiz 嘗試 / 章節進入 等行為的原始 event 流
          </p>
        </div>
        <div className="text-xs text-fg-muted">
          匹配 {(count ?? 0).toLocaleString()} 筆 · 第 {page}/{totalPages} 頁
        </div>
      </div>

      <form action={adminHref("/admin/analytics/learning-events")} className="bg-bg-card border border-border rounded-xl p-3 flex flex-wrap items-center gap-2">
        <input type="date" name="from" defaultValue={from} className="bg-bg border border-border rounded-lg px-2 py-1 text-xs" />
        <span className="text-fg-muted">→</span>
        <input type="date" name="to" defaultValue={to} className="bg-bg border border-border rounded-lg px-2 py-1 text-xs" />
        <select name="event_type" defaultValue={eventType} className="bg-bg border border-border rounded-lg px-2 py-1 text-xs">
          <option value="all">所有事件</option>
          {distinctTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="text" name="chapter_id" defaultValue={chapterId === "all" ? "" : chapterId} placeholder="章節 id" className="w-20 bg-bg border border-border rounded-lg px-2 py-1 text-xs" />
        <input type="text" name="user" defaultValue={userSearch} placeholder="user (username)" className="bg-bg border border-border rounded-lg px-2 py-1 text-xs" />
        <button type="submit" className="px-3 py-1 text-xs bg-accent text-black font-bold rounded-lg">套用</button>
        <a href={`/api/admin/learning-events/export?${exportParams.toString()}`} className="px-3 py-1 text-xs border border-border rounded-lg hover:bg-bg-elevated">
          ⬇ 匯出 CSV
        </a>
      </form>

      {resolvedUserId === "__no_match__" && (
        <div className="text-xs text-orange-500">找不到使用者「{userSearch}」、列出未過濾結果</div>
      )}

      <div className="bg-bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated text-left text-xs text-fg-muted uppercase">
            <tr>
              <th className="px-4 py-3">時間</th>
              <th className="px-4 py-3">使用者</th>
              <th className="px-4 py-3">事件</th>
              <th className="px-4 py-3">章節</th>
              <th className="px-4 py-3">lesson</th>
              <th className="px-4 py-3">metadata</th>
            </tr>
          </thead>
          <tbody>
            {events?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-fg-muted">
                  目前條件下沒有事件
                </td>
              </tr>
            ) : (
              events?.map((e: any) => {
                const u = userMap.get(e.user_id);
                return (
                  <tr key={e.id} className="border-t border-border hover:bg-bg-elevated">
                    <td className="px-4 py-2 text-xs text-fg-muted whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString("zh-TW")}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {u ? (
                        <Link href={adminHref(`/admin/users/${e.user_id}`) as any} className="hover:text-accent">
                          {u.display_name || u.username}
                        </Link>
                      ) : (
                        <span className="font-mono text-[10px]">{e.user_id?.slice?.(0, 8) ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-bg-elevated">{e.event_type}</span>
                    </td>
                    <td className="px-4 py-2 text-xs">{e.chapter_id != null ? `Ch ${String(e.chapter_id).padStart(2, "0")}` : "—"}</td>
                    <td className="px-4 py-2 text-xs">{e.lesson_id ?? "—"}</td>
                    <td className="px-4 py-2 text-[10px] text-fg-muted max-w-xs">
                      {e.metadata && (
                        <code className="block truncate" title={JSON.stringify(e.metadata)}>
                          {JSON.stringify(e.metadata).slice(0, 60)}
                        </code>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Link href={page > 1 ? (buildHref({ page: String(page - 1) }) as any) : "#"} className={`px-3 py-1.5 rounded-lg border border-border ${page <= 1 ? "opacity-40 pointer-events-none" : "hover:bg-bg-elevated"}`}>
            ← 上一頁
          </Link>
          <span className="text-xs text-fg-muted px-3">{page} / {totalPages}</span>
          <Link href={page < totalPages ? (buildHref({ page: String(page + 1) }) as any) : "#"} className={`px-3 py-1.5 rounded-lg border border-border ${page >= totalPages ? "opacity-40 pointer-events-none" : "hover:bg-bg-elevated"}`}>
            下一頁 →
          </Link>
        </div>
      )}
    </div>
  );
}
