import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * GDPR Art.15 資料可攜權：使用者下載自己的所有資料 JSON。
 *
 * 涵蓋（v1）：
 *   profile / lesson_progress / quiz_attempts / bookmarks / notes / playgrounds
 *   blog_articles / blog_comments / forum_threads / forum_replies / forum_reactions
 *   xp_events / coin_transactions / user_achievements / ai_conversations
 *   todos / pet / settings 等
 *
 * 大表（ai_messages、analytics_*）只 summary count、不全 dump（避免炸 memory）。
 */
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const uid = user.id;

  const safe = async (q: PromiseLike<{ data: any; error: any }>): Promise<any> => {
    try {
      const { data, error } = await q;
      if (error) return { _error: error.message };
      return data ?? [];
    } catch (e: any) {
      return { _error: e?.message || "exception" };
    }
  };

  const safeCount = async (q: PromiseLike<{ count: number | null; error: any }>): Promise<number> => {
    try {
      const { count } = await q;
      return count ?? 0;
    } catch {
      return 0;
    }
  };

  const [
    profile,
    lessonProgress,
    quizAttempts,
    bookmarks,
    notes,
    playgrounds,
    blogArticles,
    blogComments,
    forumThreads,
    forumReplies,
    xpEvents,
    coinTxn,
    achievements,
    todos,
    pet,
    settings,
    aiConvos,
    aiMessagesCount,
    analyticsCount,
  ] = await Promise.all([
    safe(admin.from("profiles").select("*").eq("id", uid).maybeSingle()),
    safe(admin.from("lesson_progress").select("*").eq("user_id", uid)),
    safe(admin.from("quiz_attempts").select("*").eq("user_id", uid)),
    safe(admin.from("bookmarks").select("*").eq("user_id", uid)),
    safe(admin.from("notes").select("*").eq("user_id", uid)),
    safe(admin.from("playgrounds").select("*").eq("user_id", uid)),
    safe(admin.from("user_blog_articles").select("*").eq("user_id", uid)),
    safe(admin.from("blog_comments").select("*").eq("user_id", uid)),
    safe(admin.from("forum_threads").select("*").eq("user_id", uid)),
    safe(admin.from("forum_replies").select("*").eq("user_id", uid)),
    safe(admin.from("xp_events").select("*").eq("user_id", uid)),
    safe(admin.from("coin_transactions").select("*").eq("user_id", uid)),
    safe(admin.from("user_achievements").select("*").eq("user_id", uid)),
    safe(admin.from("todos").select("*").eq("user_id", uid)),
    safe(admin.from("pets").select("*").eq("user_id", uid).maybeSingle()),
    safe(admin.from("user_settings").select("*").eq("user_id", uid).maybeSingle()),
    safe(admin.from("ai_conversations").select("id, title, model:model_id, created_at, updated_at").eq("user_id", uid)),
    safeCount(admin.from("ai_messages").select("id, ai_conversations!inner(user_id)", { count: "exact", head: true }).eq("ai_conversations.user_id", uid)),
    safeCount(admin.from("analytics_sessions").select("*", { count: "exact", head: true }).eq("user_id", uid)),
  ]);

  const payload = {
    _meta: {
      gdpr_article: "Art.15 Right of access",
      exported_at: new Date().toISOString(),
      user_id: uid,
      email: user.email,
      note: "ai_messages 與 analytics_* 只附 count、可另來信申請完整匯出。",
    },
    profile,
    lesson_progress: lessonProgress,
    quiz_attempts: quizAttempts,
    bookmarks,
    notes,
    playgrounds,
    blog_articles: blogArticles,
    blog_comments: blogComments,
    forum_threads: forumThreads,
    forum_replies: forumReplies,
    xp_events: xpEvents,
    coin_transactions: coinTxn,
    achievements,
    todos,
    pet,
    settings,
    ai_conversations: aiConvos,
    ai_messages_count: aiMessagesCount,
    analytics_sessions_count: analyticsCount,
  };

  // 寫入 gdpr_requests log（使用者自己 insert、走 RLS）
  await supabase
    .from("gdpr_requests")
    .insert({
      user_id: uid,
      request_type: "export",
      status: "completed",
      completed_at: new Date().toISOString(),
      meta: {
        row_counts: {
          lesson_progress: Array.isArray(lessonProgress) ? lessonProgress.length : 0,
          notes: Array.isArray(notes) ? notes.length : 0,
          blog_articles: Array.isArray(blogArticles) ? blogArticles.length : 0,
          forum_threads: Array.isArray(forumThreads) ? forumThreads.length : 0,
        },
      },
    })
    .then(() => {})
    .then(undefined, () => {}); // fire-and-forget

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ai-island-export-${uid.slice(0, 8)}-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
