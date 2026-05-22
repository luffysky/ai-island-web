/**
 * 把後台內部 /admin/... 路徑加上 slug 前綴。
 *
 * Middleware 把 /{ADMIN_SLUG}/admin/* 內部 rewrite 成 /admin/*、
 * 但直接訪問 /admin/* 會被 rewrite 成 /404（防 slug 猜測）。
 * 所以後台頁面內所有 Link / fetch / redirect 都要走 slug 前綴。
 *
 * 用法：<Link href={adminHref("/admin/chapters/5")}> → /console-x7k2/admin/chapters/5
 */
export const ADMIN_SLUG =
  process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2";
export const ADMIN_BASE = `/${ADMIN_SLUG}/admin`;

export function adminHref(path: string): string {
  if (path === "/admin") return ADMIN_BASE;
  if (path.startsWith("/admin/")) return path.replace(/^\/admin/, ADMIN_BASE);
  return path;
}
