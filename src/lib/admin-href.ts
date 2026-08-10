/**
 * 把後台內部 /admin/... 路徑加上 slug 前綴。
 *
 * Middleware 把 /{ADMIN_SLUG}/admin/* 內部 rewrite 成 /admin/*、
 * 但直接訪問 /admin/* 會被 rewrite 成 /404（防 slug 猜測）。
 * 所以後台頁面內所有 Link / fetch / redirect 都要走 slug 前綴。
 *
 * 用法：<Link href={adminHref("/admin/chapters/5")}> → /{slug}/admin/chapters/5
 *
 * ── ⚠️ 這個模組只能在 server 端取值 ────────────────────────────
 *
 * 舊版的取值鏈是「ADMIN_SLUG → NEXT_PUBLIC_ADMIN_SLUG → 硬編字串」，
 * 後兩者都會實際洩漏：
 *
 *   1. NEXT_PUBLIC_ 開頭的變數會在建置時被寫死進瀏覽器 bundle。
 *      任何 client 元件引用本模組，密路徑就會出現在所有訪客都下載得到的 JS。
 *   2. 硬編的預設字串更直接——它是原始碼字面值，連環境變數都不用設
 *      就會被打包進去。
 *
 * 實測（修正前）：預設值與正式 slug 同時出現在
 * `.next/static/chunks/app/layout-*.js`，也就是每位匿名訪客的每一頁。
 *
 * 因此本模組現在只讀伺服器端的 `ADMIN_SLUG`，且沒有預設值。
 * Client 元件需要後台路徑時改用 `useAdminBase()`，
 * 由 `/api/admin/base` 在執行期只發給已驗證的後台人員。
 *
 * 密路徑本來就不是安全邊界（真正的邊界是 admin layout 的角色閘門與 RLS），
 * 但把它公開等於免費幫攻擊者省下找入口的功夫。
 */
export const ADMIN_SLUG = process.env.ADMIN_SLUG ?? "";

/** 未設定 ADMIN_SLUG 時退回 /admin；middleware 會把裸 /admin 當作不存在 */
export const ADMIN_BASE = ADMIN_SLUG ? `/${ADMIN_SLUG}/admin` : "/admin";

export function adminHref(path: string): string {
  if (path === "/admin") return ADMIN_BASE;
  if (path.startsWith("/admin/")) return path.replace(/^\/admin/, ADMIN_BASE);
  return path;
}
