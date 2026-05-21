import { createSupabaseAdmin } from "@/lib/supabase";
import { resolveBlog } from "@/lib/blog-resolve";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

// XML 特殊字元跳脫
function esc(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userSlug: string }> }
) {
  const { userSlug } = await params;
  const blog = await resolveBlog(userSlug);
  if (!blog) {
    return new Response("Not found", { status: 404 });
  }

  const admin = createSupabaseAdmin();
  const { data: articles } = await admin
    .from("user_blog_articles")
    .select("title, slug, summary, published_at")
    .eq("user_id", blog.settings.user_id)
    .eq("is_public", true)
    .order("published_at", { ascending: false })
    .limit(30);

  const name = blog.profile?.display_name || blog.profile?.username || "用戶";
  const blogTitle = blog.settings.blog_title || `${name} 的部落格`;
  const blogUrl = `${SITE_URL}/blogs/${userSlug}`;

  const items = (articles ?? []).map((a: any) => `
    <item>
      <title>${esc(a.title)}</title>
      <link>${blogUrl}/${a.slug}</link>
      <guid>${blogUrl}/${a.slug}</guid>
      <description>${esc(a.summary ?? "")}</description>
      <pubDate>${new Date(a.published_at).toUTCString()}</pubDate>
    </item>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(blogTitle)}</title>
    <link>${blogUrl}</link>
    <description>${esc(blog.settings.blog_desc ?? "")}</description>
    <language>zh-TW</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
