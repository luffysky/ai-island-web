import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { calcAffinity, addForumAffinity, rankFeed } from "@/lib/fof-feed";

export const dynamic = "force-dynamic";

/**
 * 全站近期動態 feed（簡單版、不分朋友 / cohort、純最新 50 個事件）。
 * 未來升級：按 friendsOfFriends weight 排序。
 */
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [] });

  const admin = createSupabaseAdmin();
  const sevenAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  const [{ data: lessons }, { data: achievements }, { data: blogs }, { data: threads }, { data: replies }] = await Promise.all([
    admin
      .from("lesson_progress")
      .select(`user_id, chapter_id, lesson_id, created_at:completed_at,
        user:profiles!lesson_progress_user_id_fkey(username, display_name, avatar_url)`)
      .gte("completed_at", sevenAgo)
      .order("completed_at", { ascending: false })
      .limit(30),
    admin
      .from("user_achievements")
      .select(`user_id, achievement_id, unlocked_at,
        user:profiles!user_achievements_user_id_fkey(username, display_name, avatar_url)`)
      .gte("unlocked_at", sevenAgo)
      .order("unlocked_at", { ascending: false })
      .limit(20),
    admin
      .from("user_blog_articles")
      .select(`user_id, title, slug, published_at,
        user:profiles!user_blog_articles_user_id_fkey(username, display_name, avatar_url)`)
      .eq("is_public", true)
      .gte("published_at", sevenAgo)
      .order("published_at", { ascending: false })
      .limit(15),
    admin
      .from("forum_threads")
      .select(`user_id, id, title, created_at,
        user:profiles!forum_threads_user_id_fkey(username, display_name, avatar_url)`)
      .gte("created_at", sevenAgo)
      .order("created_at", { ascending: false })
      .limit(15),
    admin
      .from("forum_replies")
      .select(`user_id, id, content, thread_id, created_at,
        user:profiles!forum_replies_user_id_fkey(username, display_name, avatar_url)`)
      .gte("created_at", sevenAgo)
      .order("created_at", { ascending: false })
      .limit(15),
  ] as any);

  // 部落格連結要用 blog_slug（user_blog_settings）、不是 profile username（兩者不同、用 username 會 404）
  const blogAuthorIds = Array.from(new Set(((blogs as any[]) ?? []).map((b: any) => b.user_id)));
  const blogSlugMap = new Map<string, string>();
  if (blogAuthorIds.length > 0) {
    const { data: bset } = await admin.from("user_blog_settings").select("user_id, blog_slug").in("user_id", blogAuthorIds);
    for (const s of (bset as any[]) ?? []) if (s.blog_slug) blogSlugMap.set(s.user_id, s.blog_slug);
  }

  const items: any[] = [];

  for (const r of lessons ?? []) items.push({
    kind: "lesson",
    user_id: r.user_id,
    username: r.user?.username ?? "",
    display_name: r.user?.display_name ?? null,
    avatar_url: r.user?.avatar_url ?? null,
    title: `Ch ${r.chapter_id} · ${r.lesson_id}`,
    link: `/chapters/${r.chapter_id}`,
    at: r.created_at,
  });
  for (const a of achievements ?? []) items.push({
    kind: "achievement",
    user_id: a.user_id,
    username: a.user?.username ?? "",
    display_name: a.user?.display_name ?? null,
    avatar_url: a.user?.avatar_url ?? null,
    title: a.achievement_id,
    at: a.unlocked_at,
  });
  for (const b of blogs ?? []) items.push({
    kind: "blog",
    user_id: b.user_id,
    username: b.user?.username ?? "",
    display_name: b.user?.display_name ?? null,
    avatar_url: b.user?.avatar_url ?? null,
    title: b.title,
    link: `/blogs/${blogSlugMap.get(b.user_id) ?? b.user_id}/${b.slug}`,
    at: b.published_at,
  });
  for (const t of threads ?? []) items.push({
    kind: "forum_thread",
    user_id: t.user_id,
    username: t.user?.username ?? "",
    display_name: t.user?.display_name ?? null,
    avatar_url: t.user?.avatar_url ?? null,
    title: t.title,
    link: `/forum/thread/${t.id}`,
    at: t.created_at,
  });
  for (const r of replies ?? []) items.push({
    kind: "forum_reply",
    user_id: r.user_id,
    username: r.user?.username ?? "",
    display_name: r.user?.display_name ?? null,
    avatar_url: r.user?.avatar_url ?? null,
    title: (r.content ?? "").slice(0, 80),
    link: `/forum/thread/${r.thread_id}`,
    at: r.created_at,
  });

  // 計算 affinity（同學 / 對話過的人加權）
  const [{ data: myLessons }, { data: othersLessons }, { data: myReplies }] = await Promise.all([
    admin.from("lesson_progress").select("lesson_id").eq("user_id", user.id),
    admin.from("lesson_progress").select("user_id, lesson_id").gte("completed_at", sevenAgo).neq("user_id", user.id),
    admin.from("forum_replies").select("thread_id").eq("user_id", user.id).limit(200),
  ] as any);
  const myLessonIds = new Set((myLessons as any[] ?? []).map((r: any) => r.lesson_id));
  const affinity = calcAffinity(myLessonIds, (othersLessons as any[]) ?? []);
  // forum：對方有回過我發起的主題 → +2
  const myThreadIds = (myReplies as any[] ?? []).map((r: any) => r.thread_id);
  if (myThreadIds.length > 0) {
    const { data: pairs } = await admin
      .from("forum_replies")
      .select("user_id")
      .in("thread_id", myThreadIds)
      .neq("user_id", user.id)
      .limit(500);
    const forumPairs = ((pairs as any[]) ?? []).map((p: any) => ({ user_id: p.user_id, weight: 2 }));
    addForumAffinity(affinity, forumPairs);
  }

  // FoF feed 排序（affinity + 時間衰減）
  const ranked = rankFeed(items as any, affinity);
  return NextResponse.json({ items: ranked.slice(0, 50) });
}
