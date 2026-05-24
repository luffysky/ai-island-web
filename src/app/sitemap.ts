import type { MetadataRoute } from "next";
import { getAllChapters } from "@/lib/content";
import { DUNGEONS } from "@/data/dungeons";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const chapters = await getAllChapters();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/chapters`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE_URL}/courses`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/forum`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/blogs`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/career`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/leaderboard`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/cookies`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const courseRoutes: MetadataRoute.Sitemap = DUNGEONS.map((d) => ({
    url: `${SITE_URL}/courses/${d.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const chapterRoutes: MetadataRoute.Sitemap = chapters.map((c: any) => ({
    url: `${SITE_URL}/chapters/${c.id}`,
    // 用實際 updated_at（章節後台編輯有更新時、Google 才知道要重爬）
    lastModified: c.updated_at ? new Date(c.updated_at) : now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // 動態：公開部落格文章 + 用戶部落格主頁
  let blogRoutes: MetadataRoute.Sitemap = [];
  let forumRoutes: MetadataRoute.Sitemap = [];
  try {
    const admin = createSupabaseAdmin();
    const [{ data: articles }, { data: blogUsers }, { data: boards }, { data: threads }] = await Promise.all([
      admin
        .from("user_blog_articles")
        .select("user_slug:profiles(username), slug, updated_at")
        .eq("is_public", true)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(5000),
      admin
        .from("profiles")
        .select("username, updated_at")
        .not("username", "is", null)
        .limit(5000),
      admin.from("forum_boards").select("slug").order("sort_order"),
      admin
        .from("forum_threads")
        .select("id, updated_at")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(5000),
    ] as any);

    blogRoutes = [
      ...((articles as any[]) ?? [])
        .filter((a) => a.user_slug?.username && a.slug)
        .map((a: any) => ({
          url: `${SITE_URL}/blogs/${encodeURIComponent(a.user_slug.username)}/${encodeURIComponent(a.slug)}`,
          lastModified: a.updated_at ? new Date(a.updated_at) : now,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        })),
      ...((blogUsers as any[]) ?? []).map((u: any) => ({
        url: `${SITE_URL}/blogs/${encodeURIComponent(u.username)}`,
        lastModified: u.updated_at ? new Date(u.updated_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
    ];

    forumRoutes = [
      ...((boards as any[]) ?? []).map((b: any) => ({
        url: `${SITE_URL}/forum/${encodeURIComponent(b.slug)}`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.6,
      })),
      ...((threads as any[]) ?? []).map((t: any) => ({
        url: `${SITE_URL}/forum/thread/${t.id}`,
        lastModified: t.updated_at ? new Date(t.updated_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
    ];
  } catch {
    // DB 暫不通也別讓 sitemap 整個失敗、靜態 + 章節先頂著
  }

  return [...staticRoutes, ...courseRoutes, ...chapterRoutes, ...blogRoutes, ...forumRoutes];
}
