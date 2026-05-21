import { createSupabaseAdmin } from "@/lib/supabase";

/**
 * 從 userSlug（自訂 slug 或 user_id）解析出部落格設定 + 主人資訊
 * 回傳 null = 找不到 / 未啟用
 */
export async function resolveBlog(userSlug: string) {
  const admin = createSupabaseAdmin();

  // 先試 blog_slug、再試 user_id
  let { data: settings } = await admin
    .from("user_blog_settings")
    .select("*")
    .eq("blog_slug", userSlug)
    .maybeSingle();

  if (!settings) {
    const { data } = await admin
      .from("user_blog_settings")
      .select("*")
      .eq("user_id", userSlug)
      .maybeSingle();
    settings = data;
  }

  if (!settings || !settings.is_enabled) return null;

  // 取主人 profile
  const { data: profile } = await admin
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", settings.user_id)
    .single();

  return { settings, profile };
}

/**
 * 從 userSlug + articleSlug 解析出文章（公開的）
 * 回傳 article（含 id）或 null
 */
export async function resolveArticle(userSlug: string, articleSlug: string) {
  const blog = await resolveBlog(userSlug);
  if (!blog) return null;
  const admin = createSupabaseAdmin();
  const { data: article } = await admin
    .from("user_blog_articles")
    .select("*")
    .eq("user_id", blog.settings.user_id)
    .eq("slug", articleSlug)
    .eq("is_public", true)
    .maybeSingle();
  if (!article) return null;
  return { blog, article };
}
