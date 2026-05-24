/**
 * devLog — 開發環境才印的前端 log helper。
 *
 * 目的：client component 想記錯誤路徑時、不要直接 console.error/warn，
 * 因為 production 使用者打開 DevTools 會看到。改用 devLog 後 production
 * build 是 no-op、dev 才會印到瀏覽器 console。
 *
 * 用法：
 *   import { devLog } from "@/lib/dev-log";
 *   devLog.error("[xxx] failed:", err);
 *
 * 規則：
 * - 新增 client-side 錯誤路徑 → 一律 devLog（不要直接 console.*）
 * - server-side (API route、server lib) → console.* 沒事、使用者看不到
 * - 等對應錯誤路徑徹底修好後、回 bug/console_to_remove.md 刪掉那一條
 */

const isDev = process.env.NODE_ENV === "development";

export const devLog = {
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
};
