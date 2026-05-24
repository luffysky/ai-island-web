import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/ai/cache/clear
 * mode:
 *   "all"         全清（保險、需 confirm UI 雙重驗證）
 *   "stale"       清過去 7 天沒命中的（safe、可常用）
 *   "low_hit"     清 hit_count <= 1 的（從沒被命中過、純佔空間）
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role, username").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { mode } = await req.json().catch(() => ({} as any));
  const admin = createSupabaseAdmin();
  let deleted = 0;

  try {
    if (mode === "all") {
      const { count } = await admin.from("ai_response_cache").select("*", { count: "exact", head: true });
      await admin.from("ai_response_cache").delete().not("id", "is", null);
      deleted = count ?? 0;
    } else if (mode === "stale") {
      const cutoff = new Date(Date.now() - 7 * 86400_000).toISOString();
      const { count } = await admin
        .from("ai_response_cache")
        .select("*", { count: "exact", head: true })
        .or(`last_hit_at.lt.${cutoff},last_hit_at.is.null`);
      await admin
        .from("ai_response_cache")
        .delete()
        .or(`last_hit_at.lt.${cutoff},last_hit_at.is.null`);
      deleted = count ?? 0;
    } else if (mode === "low_hit") {
      const { count } = await admin
        .from("ai_response_cache")
        .select("*", { count: "exact", head: true })
        .lte("hit_count", 1);
      await admin.from("ai_response_cache").delete().lte("hit_count", 1);
      deleted = count ?? 0;
    } else {
      return NextResponse.json({ error: "invalid_mode" }, { status: 400 });
    }

    // 寫 audit log
    await admin.from("audit_logs").insert({
      actor_id: user.id,
      actor_username: profile.username ?? null,
      action: `cache_clear_${mode}`,
      target_type: "ai_response_cache",
      meta: { deleted_count: deleted },
    });

    return NextResponse.json({ ok: true, deleted });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "clear_failed" }, { status: 500 });
  }
}
