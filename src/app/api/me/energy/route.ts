import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { AI_FREE_DAILY } from "@/lib/ai-quota-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/me/energy — 🔋 AI 能源中心：今日免費額度 / Z 幣 / 分身島活動 / 最常用技能。
// 純讀取、不消耗；資料全從既有表算（ai_daily_quota / agent_tasks / profiles）。
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();

  // 額度（特權 / 訂閱 → 無限）
  let unlimited = false, premium = false;
  try {
    const { hasAiUnlimited } = await import("@/lib/ai-privilege");
    if (await hasAiUnlimited(user.id)) unlimited = true;
  } catch { /* ignore */ }
  if (!unlimited) {
    try {
      const { data } = await admin.rpc("has_active_subscription", { p_user_id: user.id });
      if (data) { unlimited = true; premium = true; }
    } catch { /* ignore */ }
  }
  const today = new Date().toISOString().slice(0, 10);
  let used = 0;
  if (!unlimited) {
    const { data } = await admin.from("ai_daily_quota")
      .select("free_used").eq("user_id", user.id).eq("date", today).maybeSingle();
    used = Math.max(0, (data as any)?.free_used ?? 0);
  }
  const remaining = unlimited ? null : Math.max(0, AI_FREE_DAILY - used);

  // 分身島活動
  const { data: tasks } = await admin.from("agent_tasks")
    .select("status, skill_id, created_at").eq("user_id", user.id);
  const rows = tasks ?? [];
  const monthPrefix = today.slice(0, 7);
  const todayCount = rows.filter((r) => (r.created_at || "").slice(0, 10) === today).length;
  const monthCount = rows.filter((r) => (r.created_at || "").slice(0, 7) === monthPrefix).length;
  const succeeded = rows.filter((r) => r.status === "succeeded").length;
  const finished = rows.filter((r) => ["succeeded", "failed"].includes(r.status)).length;
  const successRate = finished ? Math.round((succeeded / finished) * 100) : null;

  // 最常用技能（分身島「最耗能員工」）
  const skillCount: Record<string, number> = {};
  for (const r of rows) { if (r.skill_id) skillCount[r.skill_id] = (skillCount[r.skill_id] ?? 0) + 1; }
  const topSkillId = Object.entries(skillCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  let topSkill: { name: string; count: number } | null = null;
  if (topSkillId) {
    try {
      const { data: sk } = await admin.from("agent_skills").select("name").eq("id", topSkillId).maybeSingle();
      if ((sk as any)?.name) topSkill = { name: (sk as any).name, count: skillCount[topSkillId] };
    } catch { /* ignore */ }
  }

  const { data: prof } = await admin.from("profiles").select("z_coin").eq("id", user.id).maybeSingle();

  return NextResponse.json({
    quota: { unlimited, premium, cap: AI_FREE_DAILY, used, remaining },
    agent: { total: rows.length, todayCount, monthCount, successRate, topSkill },
    zCoin: (prof as any)?.z_coin ?? 0,
  });
}
