import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";
import { ThreadActions, ReplyActions } from "./Actions";

export const dynamic = "force-dynamic";

export default async function ForumModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.filter || "all";

  const supabase = createSupabaseAdmin();

  let tq = supabase
    .from("forum_threads")
    .select("id, title, content, is_pinned, is_featured, is_locked, is_hidden, user_id, board_id, reply_count, view_count, created_at, author:profiles(username, display_name)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (filter === "hidden") tq = tq.eq("is_hidden", true);
  if (filter === "locked") tq = tq.eq("is_locked", true);
  if (filter === "pinned") tq = tq.eq("is_pinned", true);
  const { data: threads } = await tq;

  let rq = supabase
    .from("forum_replies")
    .select("id, content, thread_id, user_id, is_hidden, created_at, author:profiles(username, display_name)")
    .order("created_at", { ascending: false })
    .limit(30);
  if (filter === "hidden") rq = rq.eq("is_hidden", true);
  const { data: replies } = await rq;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">🗣️ 論壇審核</h2>
        <p className="text-sm text-fg-muted mt-1">
          釘文、鎖串、隱藏、刪除。所有操作寫進 audit log。
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["all", "hidden", "locked", "pinned"] as const).map((f) => (
          <Link
            key={f}
            href={adminHref(`/admin/moderation/forum?filter=${f}`) as any}
            className={`px-3 py-1.5 text-xs rounded-full transition ${
              filter === f
                ? "bg-accent text-black font-bold"
                : "bg-bg-card border border-border"
            }`}
          >
            {f === "all" ? "全部" : f === "hidden" ? "🚫 已隱藏" : f === "locked" ? "🔒 已鎖" : "📌 釘文"}
          </Link>
        ))}
      </div>

      <section>
        <h3 className="font-bold mb-2 text-sm">主題（最近 50 篇）</h3>
        <div className="space-y-2">
          {threads?.length === 0 ? (
            <div className="bg-bg-card border border-border rounded-xl p-8 text-center text-sm text-fg-muted">
              無符合條件主題
            </div>
          ) : (
            threads?.map((t: any) => (
              <div key={t.id} className="bg-bg-card border border-border rounded-xl p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      {t.is_pinned && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500">📌</span>}
                      {t.is_locked && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-500">🔒</span>}
                      {t.is_featured && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-500">⭐</span>}
                      {t.is_hidden && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400">🚫</span>}
                      <span className="font-semibold truncate">{t.title}</span>
                    </div>
                    <div className="text-xs text-fg-muted">
                      {t.author?.display_name || t.author?.username || "—"} · {t.reply_count ?? 0} 回覆 · {t.view_count ?? 0} 瀏覽 · {new Date(t.created_at).toLocaleDateString("zh-TW")}
                    </div>
                  </div>
                  <ThreadActions thread={t} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h3 className="font-bold mb-2 text-sm">回覆（最近 30 則{filter === "hidden" ? "、已隱藏" : ""}）</h3>
        <div className="space-y-2">
          {replies?.length === 0 ? (
            <div className="bg-bg-card border border-border rounded-xl p-8 text-center text-sm text-fg-muted">
              無回覆
            </div>
          ) : (
            replies?.map((r: any) => (
              <div key={r.id} className="bg-bg-card border border-border rounded-xl p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      {r.is_hidden && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400">🚫</span>}
                      <span className="text-xs text-fg-muted">
                        {r.author?.display_name || r.author?.username || "—"} · {new Date(r.created_at).toLocaleString("zh-TW")}
                      </span>
                    </div>
                    <div className="text-sm whitespace-pre-wrap break-words line-clamp-3">{r.content}</div>
                  </div>
                  <ReplyActions reply={r} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
