import { createServerClient } from '@supabase/ssr';

// Admin client（service role、bypass RLS、只能在 server 用）
// ⚠️ 永遠不要在 client component 內 import 這個
export function createSupabaseAdmin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
}
