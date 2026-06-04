import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/kpi.json?days=7
 * 給 cron 用 — 拿 KPI JSON、自己餵 email 服務。
 * 限 admin（或帶 CRON_SECRET header）。
 */
export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  let isAuthorized = false;
  if (expected && cronSecret === expected) {
    isAuthorized = true;
  } else {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const admin = createSupabaseAdmin();
      const { data: prof } = await admin.from("profiles").select("role").eq("id", user.id).single();
      if ((prof as any)?.role === "admin") isAuthorized = true;
    }
  }
  if (!isAuthorized) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const days = Math.max(1, Math.min(365, parseInt(req.nextUrl.searchParams.get("days") ?? "7", 10) || 7));
  const admin = createSupabaseAdmin();
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const [
    { count: signups },
    { count: activeSubs },
    { data: lessons },
    { data: orders },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", since),
    admin.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    admin.from("lesson_progress").select("user_id").gte("completed_at", since).limit(50000),
    admin.from("orders").select("amount_twd:amount").eq("status", "paid").gte("created_at", since),
  ] as any);

  const revenueTwd = ((orders as any[]) ?? []).reduce((s: number, o: any) => s + Number(o.amount_twd ?? 0), 0);
  const distinctActive = new Set((lessons as any[] ?? []).map((l: any) => l.user_id)).size;

  return NextResponse.json({
    period_days: days,
    period_start: since,
    signups: signups ?? 0,
    active_subs: activeSubs ?? 0,
    lessons_done: (lessons as any[])?.length ?? 0,
    distinct_active: distinctActive,
    revenue_twd: revenueTwd,
    generated_at: new Date().toISOString(),
  });
}
