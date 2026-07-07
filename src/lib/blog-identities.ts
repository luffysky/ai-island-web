/**
 * 部落格「發文身份」：一般使用者只能以自己身份發；owner/admin/客服 可用官方身份發文。
 * 儲存在 user_blog_articles.author_identity（'self' | 'official' | 'admin' | 'support'）。
 * 顯示時若非 self、就用官方名稱 + 徽章取代個人名字（文章仍歸原作者、可自己編輯）。
 */
export type BlogIdentity = "self" | "official" | "admin" | "support";

export const OFFICIAL_IDENTITIES: Record<Exclude<BlogIdentity, "self">, { label: string; badge: string; emoji: string }> = {
  official: { label: "AI 島官方", badge: "官方", emoji: "📢" },
  admin: { label: "AI 島 管理員", badge: "管理員", emoji: "🛡️" },
  support: { label: "AI 島 客服", badge: "客服", emoji: "🎧" },
};

/** 某 role 能用哪些發文身份。owner/admin 全開；editor 可官方；support role 可客服；其餘只有自己。 */
export function allowedBlogIdentities(role?: string | null): BlogIdentity[] {
  const r = String(role ?? "").toLowerCase();
  if (r === "owner" || r === "admin") return ["self", "official", "admin", "support"];
  if (r === "editor") return ["self", "official"];
  if (r === "support" || r === "cs") return ["self", "support"];
  return ["self"];
}

export function isBlogIdentity(v: unknown): v is BlogIdentity {
  return v === "self" || v === "official" || v === "admin" || v === "support";
}

/** 把 author_identity 解析成顯示用的作者資訊（非 self 就換官方名 + 徽章）。 */
export function resolveBlogAuthor(
  identity: string | null | undefined,
  fallback: { name: string; avatar?: string | null },
): { name: string; badge?: string; emoji?: string; official: boolean; avatar?: string | null } {
  const id = (identity ?? "self") as BlogIdentity;
  if (id !== "self" && OFFICIAL_IDENTITIES[id]) {
    const o = OFFICIAL_IDENTITIES[id];
    return { name: o.label, badge: o.badge, emoji: o.emoji, official: true, avatar: null };
  }
  return { name: fallback.name, official: false, avatar: fallback.avatar ?? null };
}
