import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { chapters } from "@/data/chapters";
import { isIslandEnabled } from "@/lib/app-settings";
import IslandClient from "./IslandClient";
import IslandClosed from "./IslandClosed";

export const dynamic = "force-dynamic";

export default async function IslandPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  // 島嶼開關：關閉時、非 admin 顯示「敬請期待」
  const enabled = await isIslandEnabled();
  let isAdmin = false;
  if (user) {
    const { data: meRole } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    isAdmin = (meRole as any)?.role === "admin" || (meRole as any)?.role === "owner";
  }
  if (!enabled && !isAdmin) {
    return <IslandClosed />;
  }

  let completedChapterIds: number[] = [];
  const chapterPctMap: Record<number, number> = {};
  let level = 1;
  let petName: string | null = null;
  let userProfile: any = null;
  if (user) {
    const [{ data: progress }, { data: profile }, { data: pet }] = await Promise.all([
      supabase.from("lesson_progress").select("chapter_id, lesson_id").eq("user_id", user.id),
      supabase.from("profiles").select("username, display_name, avatar_url, level, xp, z_coin").eq("id", user.id).single(),
      supabase.from("pets").select("name").eq("user_id", user.id).maybeSingle(),
    ] as any);
    userProfile = profile;
    const set = new Set<number>();
    const counts = new Map<number, number>();
    for (const p of (progress as any[]) ?? []) {
      if (p.chapter_id) {
        set.add(Number(p.chapter_id));
        counts.set(Number(p.chapter_id), (counts.get(Number(p.chapter_id)) ?? 0) + 1);
      }
    }
    completedChapterIds = Array.from(set).sort((a, b) => a - b);
    level = (profile as any)?.level ?? 1;
    petName = (pet as any)?.name ?? null;
    for (const ch of chapters) {
      const done = counts.get(ch.id) ?? 0;
      chapterPctMap[ch.id] = ch.lessons.length > 0 ? Math.round((done / ch.lessons.length) * 100) : 0;
    }
  }

  // 用 admin 撈 modal 內要顯示的清單（前 5-10 筆）
  const admin = createSupabaseAdmin();
  const [{ data: topUsers }, { data: latestThreads }, { data: latestBlogs }, { data: courses }] = await Promise.all([
    admin.from("profiles").select("id, username, display_name, avatar_url, xp, level").is("banned_at", null).order("xp", { ascending: false }).limit(10),
    admin.from("forum_threads").select("id, title, created_at").order("created_at", { ascending: false }).limit(8),
    admin.from("user_blog_articles").select("title, slug, published_at, user_id").eq("is_public", true).order("published_at", { ascending: false }).limit(8),
    admin.from("courses").select("slug, title, emoji, difficulty").eq("is_published", true).order("created_at", { ascending: false }).limit(8),
  ] as any).catch(() => [{ data: [] }, { data: [] }, { data: [] }, { data: [] }] as any);

  // 部落格作者 username 查詢
  let blogList: any[] = [];
  if ((latestBlogs as any[])?.length) {
    const uids = Array.from(new Set((latestBlogs as any[]).map((b: any) => b.user_id)));
    const { data: ps } = await admin.from("profiles").select("id, username").in("id", uids);
    const m = new Map((ps as any[] ?? []).map((p: any) => [p.id, p.username]));
    blogList = (latestBlogs as any[]).map((b: any) => ({ ...b, username: m.get(b.user_id) ?? "" }));
  }

  return (
    <IslandClient
      completedChapterIds={completedChapterIds}
      level={level}
      petName={petName}
      profile={userProfile}
      chapters={chapters.map((c) => ({ id: c.id, title: c.title, emoji: (c as any).emoji ?? "📘", pct: chapterPctMap[c.id] ?? 0 }))}
      topUsers={(topUsers as any) ?? []}
      threads={(latestThreads as any) ?? []}
      blogs={blogList}
      courses={(courses as any) ?? []}
    />
  );
}
