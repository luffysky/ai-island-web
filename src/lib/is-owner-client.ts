/**
 * Client-side / 輕量版 owner check — 給 UI 元件用 (TopNav / CommandPalette / Toolbar)
 *
 * 跟 is-owner.ts (server) 的 checkOwner 邏輯一致、但只看 role + username (不查 auth.users email)。
 * 因為 client 拿不到 email、env 變數要走 NEXT_PUBLIC_ 才能用。
 *
 * 90% 情況 role === 'owner' 就命中、不需要再多 signal。
 */

const DEFAULT_OWNER_USERNAMES = ["luffysky00", "luffysky004"];

/** role 是 admin 或 owner = 可進後台 */
export function canAccessAdmin(profile: { role?: string | null } | null | undefined): boolean {
  const r = profile?.role;
  return r === "admin" || r === "owner";
}

/** 是 owner — 林董本人 */
export function isOwnerProfile(profile: { role?: string | null; username?: string | null } | null | undefined): boolean {
  if (!profile) return false;
  if (profile.role === "owner") return true;
  const u = (profile.username ?? "").toLowerCase();
  if (!u) return false;
  return DEFAULT_OWNER_USERNAMES.some((n) => u === n || u.startsWith(n + "_"));
}
