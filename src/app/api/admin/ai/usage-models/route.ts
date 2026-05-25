import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { invalidateUsageCache } from "@/lib/ai-usage-models";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "owner"].includes((profile as any).role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as any));
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) return NextResponse.json({ error: "no_rows" }, { status: 400 });

  const admin = createSupabaseAdmin();
  let upserted = 0;
  for (const r of rows) {
    if (!r.usage_key) continue;
    if (!r.model_name) {
      // 空 = 刪掉設定、走 fallback
      await admin.from("ai_usage_models").delete().eq("usage_key", r.usage_key);
      continue;
    }
    const { error } = await admin.from("ai_usage_models").upsert({
      usage_key: r.usage_key,
      description: r.description ?? null,
      model_name: r.model_name,
      enabled: r.enabled !== false,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    });
    if (!error) upserted++;
  }

  invalidateUsageCache();
  return NextResponse.json({ ok: true, upserted });
}
