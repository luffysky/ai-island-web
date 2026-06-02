import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { invalidateUsageCache } from "@/lib/ai-usage-models";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

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
      updated_by: gate.userId,
    });
    if (!error) upserted++;
  }

  invalidateUsageCache();
  return NextResponse.json({ ok: true, upserted });
}
