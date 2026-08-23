import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// 只讀伺服器端變數、且沒有預設值。
// NEXT_PUBLIC_ 會被寫進瀏覽器 bundle，硬編字串更是直接躺在原始碼裡——
// 兩者都會讓密路徑對所有訪客公開（見 src/lib/admin-href.ts 的說明）。
const ADMIN_SLUG = process.env.ADMIN_SLUG?.trim() || '';

// §7.0.1 SEO 轉址：middleware 讀「啟用中」的 seo_redirects 套 301/302。
// 為避免每個請求都打 DB：模組層快取 60 秒（Edge isolate 重用時就命中）、直接打 Supabase PostgREST（anon）、失敗保持放行。
type RedirectRule = { to: string; code: number };
let redirectCache: { map: Map<string, RedirectRule>; ts: number } | null = null;
const REDIRECT_TTL_MS = 60_000;

async function getRedirectMap(): Promise<Map<string, RedirectRule>> {
  if (redirectCache && Date.now() - redirectCache.ts < REDIRECT_TTL_MS) return redirectCache.map;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return redirectCache?.map ?? new Map();
  try {
    const res = await fetch(
      `${url}/rest/v1/seo_redirects?enabled=eq.true&select=from_path,to_path,status_code`,
      { headers: { apikey: anon, Authorization: `Bearer ${anon}` }, cache: "no-store" },
    );
    if (!res.ok) return redirectCache?.map ?? new Map();
    const rows = (await res.json()) as { from_path: string; to_path: string; status_code: number }[];
    const map = new Map<string, RedirectRule>();
    for (const r of rows) map.set(r.from_path, { to: r.to_path, code: r.status_code || 301 });
    redirectCache = { map, ts: Date.now() };
    return map;
  } catch {
    return redirectCache?.map ?? new Map();   // 讀失敗就放行、不擋站
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. /[ADMIN_SLUG]/admin/* → internal rewrite 到 /admin/*
  const adminBase = ADMIN_SLUG ? `/${ADMIN_SLUG}/admin` : '';
  if (adminBase && (pathname === adminBase || pathname.startsWith(`${adminBase}/`))) {
    const rest = pathname.slice(adminBase.length);
    const newPath = `/admin${rest}`;
    const url = request.nextUrl.clone();
    url.pathname = newPath;
    // 把內部後台路徑透過 request header 傳給 layout（server component 無法直接讀 pathname）
    // → layout 用它做 RBAC section 頁面 gate（見 src/lib/admin-roles.ts）。
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-admin-path", newPath);
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // 2. 阻擋直接訪問 /admin（任何想猜的人都會 404）
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return NextResponse.rewrite(new URL('/404', request.url));
  }

  // 2.5 §7.0.1 SEO 轉址：查 seo_redirects（快取），命中就 301/302。
  //     只對 GET 的一般頁面路徑套用（跳過 /api、/_next、後台）。比對 from_path 用「去掉結尾斜線」的正規化。
  if (request.method === 'GET' && !pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
    const map = await getRedirectMap();
    if (map.size > 0) {
      const key = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
      const rule = map.get(pathname) || map.get(key);
      if (rule && rule.to !== pathname) {
        const dest = /^https?:\/\//.test(rule.to) ? rule.to : new URL(rule.to, request.url).toString();
        return NextResponse.redirect(dest, rule.code === 302 || rule.code === 307 || rule.code === 308 ? rule.code : 301);
      }
    }
  }

  // 3. Supabase session refresh
  let response = NextResponse.next({ request });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    await supabase.auth.getUser();
  } catch {}

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
