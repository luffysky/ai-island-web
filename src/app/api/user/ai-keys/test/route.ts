import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { testProviderKey } from "@/lib/ai-key-test";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 使用者 BYOK：存之前先驗證 key 有沒有效（跟管理員後台同一套測試）。
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = rateLimit(`byok-test:${user.id}`, 15, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "太頻繁、稍後再試" }, { status: 429 });

  const { provider, apiKey } = await req.json();
  if (!provider || !apiKey) return NextResponse.json({ error: "缺 provider 或 apiKey" }, { status: 400 });

  const r = await testProviderKey(String(provider), String(apiKey));
  const hint = r.ok
    ? "✅ key 有效、可以儲存使用"
    : r.status === 401 || r.status === 403
      ? "key 無效 / 已失效 / 打錯（複製整段、別漏字）"
      : r.status === 429
        ? "key 有效、但目前被原廠限流"
        : (r.body || "驗證失敗");
  return NextResponse.json({ ok: r.ok, status: r.status, hint });
}
