// Re-export 各環境的 client、保持 backward compatible
// 新 code 建議直接從具體檔案 import：
//   - client component → '@/lib/supabase-browser'
//   - server component / API → '@/lib/supabase-server'
//   - admin (bypass RLS) → '@/lib/supabase-admin'

export { createSupabaseBrowser } from './supabase-browser';
export { createSupabaseServer } from './supabase-server';
export { createSupabaseAdmin } from './supabase-admin';
