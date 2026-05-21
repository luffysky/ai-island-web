// 部落格系統型別

export interface BlogSettings {
  id: string;
  user_id: string;
  blog_slug: string | null;
  blog_title: string | null;
  blog_desc: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlogArticle {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;            // TipTap HTML
  cover_image: string | null;
  cover_image_position: string;
  tags: string[];
  category: string | null;
  is_public: boolean;
  view_count: number;
  seo_title: string | null;
  seo_desc: string | null;
  series_id: string | null;
  series_order: number | null;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface BlogSeries {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlogComment {
  id: string;
  article_id: string;
  parent_id: string | null;
  user_id: string | null;
  author_name: string;
  author_email: string | null;
  author_avatar: string | null;
  content: string;
  is_approved: boolean;
  created_at: string;
  replies?: BlogComment[];
}

export interface BlogReaction {
  id: string;
  article_id: string;
  fingerprint: string;
  emoji: string;
  created_at: string;
}

export interface BlogSubscriber {
  id: string;
  blog_user_id: string;
  email: string;
  name: string | null;
  is_verified: boolean;
  created_at: string;
}

// slug 工具：把標題轉成 URL slug
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, "")  // 保留中英數、空白、連字號
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || `post-${Date.now()}`;
}
