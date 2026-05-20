import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton client - 全 app 共用一個 instance、避免多個 instance 互相搶 lock
// 不然會出現 "AbortError: signal is aborted without reason"
let client: SupabaseClient | null = null;

export function createSupabaseBrowser(): SupabaseClient {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return client;
}
