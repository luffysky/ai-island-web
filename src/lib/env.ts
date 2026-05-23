/**
 * 啟動時驗證必要環境變數、缺值早 crash（不要等到 runtime 才 boom）。
 * 在 supabase-server / supabase-admin / supabase-browser 各自 import 自己會驗。
 *
 * 用法：const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
 */

const VERIFIED = new Set<string>();

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    const msg = `[env] required env var "${name}" is missing.\n` +
      `Please set it in .env.local (dev) or in your hosting provider (Zeabur / Vercel).`;
    // 在 server 啟動時直接拋；client side 不會跑到（NEXT_PUBLIC_* 是 inline 進 bundle）
    if (typeof window === "undefined") {
      console.error(msg);
      throw new Error(msg);
    } else {
      // client 端只警告（NEXT_PUBLIC_X 若缺值代表 build 時就缺、應該 build 失敗）
      if (!VERIFIED.has(name)) {
        console.warn(msg);
        VERIFIED.add(name);
      }
      return "";
    }
  }
  VERIFIED.add(name);
  return v;
}

export function optionalEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}
