import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseAdmin } from "@/lib/supabase";
import { ThreadReplies } from "@/components/forum/ThreadReplies";
import { ThreadViewTracker } from "@/components/forum/ThreadViewTracker";
import { ThreadReactionBar } from "@/components/forum/ThreadReactionBar";
import { ArrowLeft, Eye, MessageSquare, Pin, Star, Lock } from "lucide-react";
import type { ForumReply } from "@/lib/forum-types";
import { sanitizeRichHtml } from "@/lib/rich-html";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

async function getThread(id: string) {
  const admin = createSupabaseAdmin();
  const { data: thread } = await admin
    .from("forum_threads")
    .select(`
      *,
      author:profiles!forum_threads_user_id_fkey(username, display_name, avatar_url, level),
      board:forum_boards!forum_threads_board_id_fkey(name, slug, emoji)
    `)
    .eq("id", id)
    .maybeSingle();
  if (!thread) return null;

  const { data: replyRows } = await admin
    .from("forum_replies")
    .select(`*, author:profiles!forum_replies_user_id_fkey(username, display_name, avatar_url, level)`)
    .eq("thread_id", id)
    .order("created_at", { ascending: true });

  // 組巢狀
  const all = (replyRows ?? []) as ForumReply[];
  const byId: Record<string, ForumReply> = {};
  const topLevel: ForumReply[] = [];
  all.forEach((r) => { byId[r.id] = { ...r, replies: [] }; });
  all.forEach((r) => {
    if (r.parent_id && byId[r.parent_id]) byId[r.parent_id].replies!.push(byId[r.id]);
    else topLevel.push(byId[r.id]);
  });

  return { thread, replies: topLevel };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const res = await getThread(id);
  if (!res) return { title: "找不到主題 | AI 島" };
  return {
    title: `${res.thread.title} | AI 島討論區`,
    description: res.thread.title,
    alternates: { canonical: `${SITE_URL}/forum/thread/${id}` },
  };
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getThread(id);
  if (!res) notFound();

  const { thread, replies } = res;
  const name = thread.author?.display_name || thread.author?.username || "用戶";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 min-w-0 overflow-hidden">
      <ThreadViewTracker threadId={id} />

      {/* 麵包屑 */}
      <div className="text-sm text-[var(--color-fg-muted)] mb-4 flex items-center gap-1">
        <Link href="/forum" className="hover:text-[var(--color-fg)]">討論區</Link>
        <span>/</span>
        {thread.board && (
          <Link href={`/forum/${thread.board.slug}`} className="hover:text-[var(--color-fg)]">
            {thread.board.emoji} {thread.board.name}
          </Link>
        )}
      </div>

      {/* 主題串 */}
      <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 sm:p-6">
        {/* 標題 + 標記 */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {thread.is_pinned && <Pin size={16} className="text-[var(--color-accent)]" />}
          {thread.is_featured && <Star size={16} className="text-yellow-400" />}
          {thread.is_locked && <Lock size={16} className="text-[var(--color-fg-muted)]" />}
          <h1 className="text-2xl font-bold">{thread.title}</h1>
        </div>

        {/* 作者 meta */}
        <div className="flex items-center gap-2 text-sm text-[var(--color-fg-muted)] mb-4 pb-4 border-b border-[var(--color-border)]">
          {thread.author?.avatar_url ? (
            <Image
              src={thread.author.avatar_url}
              alt=""
              width={28}
              height={28}
              unoptimized
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[var(--color-bg-elevated)] flex items-center justify-center text-xs">
              {name[0]}
            </div>
          )}
          <Link href={`/forum/user/${thread.user_id}`} className="font-medium text-[var(--color-fg)] hover:text-[var(--color-accent)]">
            {name}
          </Link>
          <span className="px-1 py-px rounded bg-[var(--color-bg-elevated)] text-[9px] font-bold">
            Lv{thread.author?.level ?? 1}
          </span>
          <span>·</span>
          <span>{new Date(thread.created_at).toLocaleDateString("zh-TW")}</span>
          <span className="flex items-center gap-0.5"><Eye size={12} /> {thread.view_count}</span>
          <span className="flex items-center gap-0.5"><MessageSquare size={12} /> {thread.reply_count}</span>
        </div>

        {/* 內文 */}
        {thread.content ? (
          <div className="prose-custom max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(thread.content) }} />
        ) : (
          <p className="text-[var(--color-fg-muted)] italic">（沒有內文）</p>
        )}

        {/* 標籤 */}
        {thread.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {thread.tags.map((t: string) => (
              <span key={t} className="text-xs px-2 py-1 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)]">
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* 主題串 emoji 反應 */}
        <ThreadReactionBar threadId={id} />
      </article>

      {/* 回覆區 */}
      <ThreadReplies threadId={id} initialReplies={replies} isLocked={thread.is_locked} threadOwnerId={thread.user_id} />
    </div>
  );
}
