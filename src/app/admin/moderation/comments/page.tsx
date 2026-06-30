import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { ModerationActions } from "./ModerationActions";
import { ArrowLeft, ArrowRight, Circle, CheckCircle, List } from "lucide-react";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function CommentsModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.filter || "pending";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const off = (page - 1) * PAGE_SIZE;

  const supabase = createSupabaseAdmin();
  let q = supabase
    .from("blog_comments")
    .select("*, article:user_blog_articles(title, slug, user_id), commenter:profiles(username, display_name)", { count: "exact" });
  if (filter === "pending") q = q.eq("is_approved", false);
  if (filter === "approved") q = q.eq("is_approved", true);
  const { data: comments, count } = await q
    .order("created_at", { ascending: false })
    .range(off, off + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <PageHero
        emoji="📝"
        title="部落格留言審核"
        desc={`${filter === "pending" ? "待審核" : filter === "approved" ? "已通過" : "全部"} ${(count ?? 0).toLocaleString()} 筆。先檢查 spam / NSFW、再批准。`}
        gradient="from-blue-500/10 via-sky-500/10 to-cyan-500/10"
        borderColor="border-blue-500/30"
      />

      <div className="flex gap-2">
        {(["pending", "approved", "all"] as const).map((f) => (
          <Link
            key={f}
            href={adminHref(`/admin/moderation/comments?filter=${f}`) as any}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition ${
              filter === f
                ? "bg-accent text-black font-bold"
                : "bg-bg-card border border-border"
            }`}
          >
            {f === "pending" ? (
              <><Circle className="w-3.5 h-3.5" /> 待審核</>
            ) : f === "approved" ? (
              <><CheckCircle className="w-3.5 h-3.5" /> 已通過</>
            ) : (
              <><List className="w-3.5 h-3.5" /> 全部</>
            )}
          </Link>
        ))}
      </div>

      {comments?.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center text-fg-muted">
          {filter === "pending" ? "✅ 沒有待審留言" : "—"}
        </div>
      ) : (
        <div className="space-y-3">
          {comments?.map((c: any) => (
            <div key={c.id} className="bg-bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="text-xs text-fg-muted">
                  <span className="font-bold text-fg">
                    {c.commenter?.display_name || c.commenter?.username || c.author_name || "匿名"}
                  </span>
                  {c.author_email && <span className="ml-2">{c.author_email}</span>}
                  <span className="ml-2">{new Date(c.created_at).toLocaleString("zh-TW")}</span>
                </div>
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
                  c.is_approved ? "bg-emerald-500/20 text-emerald-500" : "bg-yellow-500/20 text-yellow-500"
                }`}>
                  {c.is_approved ? <><CheckCircle className="w-3 h-3" /> 通過</> : <><Circle className="w-3 h-3" /> 待審</>}
                </span>
              </div>
              <div className="text-sm whitespace-pre-wrap mb-2 break-words">{c.content}</div>
              {c.article && (
                <div className="text-[10px] text-fg-muted">
                  ↳ 文章：{c.article.title}
                </div>
              )}
              <ModerationActions commentId={c.id} approved={c.is_approved} />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Link
            href={page > 1 ? (adminHref(`/admin/moderation/comments?filter=${filter}&page=${page - 1}`) as any) : "#"}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border ${page <= 1 ? "opacity-40 pointer-events-none" : "hover:bg-bg-elevated"}`}
          >
            <ArrowLeft className="w-4 h-4" /> 上一頁
          </Link>
          <span className="text-xs text-fg-muted px-3">{page} / {totalPages}</span>
          <Link
            href={page < totalPages ? (adminHref(`/admin/moderation/comments?filter=${filter}&page=${page + 1}`) as any) : "#"}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border ${page >= totalPages ? "opacity-40 pointer-events-none" : "hover:bg-bg-elevated"}`}
          >
            下一頁 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
