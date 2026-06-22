import { createSupabaseAdmin } from "@/lib/supabase";

/**
 * 從 userSlug（自訂 slug 或 user_id）解析出部落格設定 + 主人資訊
 * 回傳 null = 找不到 / 未啟用
 */
export async function resolveBlog(userSlug: string) {
  const admin = createSupabaseAdmin();

  // 先試 blog_slug（大小寫不敏感：slug 存的是 slugify 後的小寫、但連結/網址可能帶大寫
  // 如 /blogs/Luffysky → 不能用 .eq 精確比、否則撞不到 luffysky 而 404）
  let { data: settings } = await admin
    .from("user_blog_settings")
    .select("*")
    .ilike("blog_slug", userSlug)
    .maybeSingle();

  // 再試 user_id（UUID）
  if (!settings) {
    const { data } = await admin
      .from("user_blog_settings")
      .select("*")
      .eq("user_id", userSlug)
      .maybeSingle();
    settings = data;
  }

  // 最後試 profile username（有人用 /blogs/<username> 進來）
  if (!settings) {
    const { data: prof } = await admin
      .from("profiles")
      .select("id")
      .ilike("username", userSlug)
      .maybeSingle();
    if (prof) {
      const { data } = await admin
        .from("user_blog_settings")
        .select("*")
        .eq("user_id", prof.id)
        .maybeSingle();
      settings = data;
    }
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
    .ilike("slug", articleSlug)
    .eq("is_public", true)
    .maybeSingle();
  if (!article) return null;
  return { blog, article };
}
