import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { getCachedTranslations } from "@/lib/content-i18n";
import { createSupabaseAdmin } from "@/lib/supabase";
import { ThreadReplies } from "@/components/forum/ThreadReplies";
import { ThreadViewTracker } from "@/components/forum/ThreadViewTracker";
import { ThreadReactionBar } from "@/components/forum/ThreadReactionBar";
import { ThreadPostActions } from "@/components/forum/ThreadPostActions";
import { ArrowLeft, Eye, MessageSquare, Pin, Star, Lock } from "lucide-react";
import type { ForumReply } from "@/lib/forum-types";
import { sanitizeRichHtmlStrict } from "@/lib/rich-html-server";

// OPT-9 ISR：討論串主文每 60 秒 revalidate（回覆走 ThreadReplies client component、保持即時）
export const revalidate = 60;

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
  const t = await getTranslations("forum");
  if (!res) return { title: t("metaThreadNotFound") };
  return {
    title: t("metaThread", { title: res.thread.title }),
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

  const t = await getTranslations("forum");
  const { thread, replies } = res;
  const name = thread.author?.display_name || thread.author?.username || t("defaultUser");

  // i18n：非中文用已快取的譯文覆蓋主題標題/內文（無則 fallback 中文）
  const locale = await getLocale();
  const tr = locale !== "zh"
    ? await getCachedTranslations("forum", thread.id, locale, { title: thread.title, content: thread.content ?? "" })
    : {};
  const dispTitle = tr.title ?? thread.title;
  const dispContent = tr.content ?? thread.content;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 min-w-0 overflow-hidden">
      <ThreadViewTracker threadId={id} />

      {/* 麵包屑 */}
      <div className="text-sm text-fg-muted mb-4 flex items-center gap-1">
        <Link href="/forum" className="hover:text-fg">{t("title")}</Link>
        <span>/</span>
        {thread.board && (
          <Link href={`/forum/${thread.board.slug}`} className="hover:text-fg">
            {thread.board.emoji} {thread.board.name}
          </Link>
        )}
      </div>

      {/* 主題串 */}
      <article className={`reveal surface p-5 sm:p-6 ${thread.is_featured ? "glow-accent" : ""}`}>
        {/* 標題 + 標記 */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {thread.is_pinned && <Pin size={16} className="text-accent" />}
          {thread.is_featured && <Star size={16} className="text-yellow-400" />}
          {thread.is_locked && <Lock size={16} className="text-fg-muted" />}
          <h1 className="text-2xl font-bold">{dispTitle}</h1>
        </div>

        {/* 作者 meta */}
        <div className="flex items-center gap-2 text-sm text-fg-muted mb-4 pb-4 border-b border-border">
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
            <div className="w-7 h-7 rounded-full bg-bg-elevated flex items-center justify-center text-xs">
              {name[0]}
            </div>
          )}
          <Link href={`/forum/user/${thread.user_id}`} className="font-medium text-fg hover:text-accent">
            {name}
          </Link>
          <span className="px-1 py-px rounded bg-bg-elevated text-[9px] font-bold">
            Lv{thread.author?.level ?? 1}
          </span>
          <span>·</span>
          <span>{new Date(thread.created_at).toLocaleDateString("zh-TW")}</span>
          <span className="flex items-center gap-0.5"><Eye size={12} /> {thread.view_count}</span>
          <span className="flex items-center gap-0.5"><MessageSquare size={12} /> {thread.reply_count}</span>
        </div>

        {/* 內文 */}
        {dispContent ? (
          <div className="prose-custom max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeRichHtmlStrict(dispContent) }} />
        ) : (
          <p className="text-fg-muted italic">{t("noContent")}</p>
        )}

        {/* 標籤 */}
        {thread.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {thread.tags.map((t: string) => (
              <span key={t} className="text-xs px-2 py-1 rounded-full bg-bg-elevated text-fg-muted">
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* 主題串 emoji 反應 */}
        <ThreadReactionBar threadId={id} />

        {/* 主文操作：存成筆記 + 分享 */}
        <ThreadPostActions
          threadId={id}
          threadTitle={dispTitle}
          threadContentHtml={dispContent ? sanitizeRichHtmlStrict(dispContent) : ""}
          threadUrl={`${SITE_URL}/forum/thread/${id}`}
        />
      </article>

      {/* 回覆區 */}
      <ThreadReplies threadId={id} threadTitle={dispTitle} initialReplies={replies} isLocked={thread.is_locked} threadOwnerId={thread.user_id} />
    </div>
  );
}
