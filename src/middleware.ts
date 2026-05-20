import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const ADMIN_SLUG = process.env.ADMIN_SLUG || process.env.NEXT_PUBLIC_ADMIN_SLUG || 'console-x7k2';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. /[ADMIN_SLUG]/admin/* → internal rewrite 到 /admin/*
  const adminBase = `/${ADMIN_SLUG}/admin`;
  if (pathname === adminBase || pathname.startsWith(`${adminBase}/`)) {
    const rest = pathname.slice(adminBase.length);
    const newPath = `/admin${rest}`;
    const url = request.nextUrl.clone();
    url.pathname = newPath;
    return NextResponse.rewrite(url);
  }

  // 2. 阻擋直接訪問 /admin（任何想猜的人都會 404）
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return NextResponse.rewrite(new URL('/404', request.url));
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
