import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * 批次寫入 AI 生成的挑戰
 *   POST { challenges: [{level, category, title, scenario, task, starter_code, test_code, hints, solution, solution_explain, xp_award}] }
 * 自動分配 id (py-{level}-{nextNum})、sort_order 也自動。
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role, username").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({} as any));
  const list = Array.isArray(body.challenges) ? body.challenges : [];
  if (list.length === 0) return NextResponse.json({ error: "empty" }, { status: 400 });
  if (list.length > 20) return NextResponse.json({ error: "too_many" }, { status: 400 });

  const admin = createSupabaseAdmin();

  // 拿目前各 level 最大序號 + sort_order
  const { data: existing } = await admin
    .from("nami_challenges")
    .select("id, sort_order");
  const existingIds = new Set((existing as any[] ?? []).map((r) => r.id));
  const maxSortOrder = Math.max(0, ...((existing as any[] ?? []).map((r) => Number(r.sort_order) || 0)));
  const levelCounts: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
  for (const r of (existing as any[] ?? [])) {
    const m = String(r.id).match(/^py-([emh])(\d+)/);
    if (m) {
      const lvl = { e: "easy", m: "medium", h: "hard" }[m[1]]!;
      levelCounts[lvl] = Math.max(levelCounts[lvl], parseInt(m[2], 10));
    }
  }

  const rows: any[] = [];
  let sortOrder = maxSortOrder + 1;
  for (const c of list) {
    const lvl = c.level === "easy" || c.level === "medium" || c.level === "hard" ? c.level : "easy";
    const prefix = lvl[0]; // e / m / h
    levelCounts[lvl] = (levelCounts[lvl] ?? 0) + 1;
    let id = c.id || `py-${prefix}${String(levelCounts[lvl]).padStart(2, "0")}`;
    // 防衝突 (若 id 已存在、自動 -gen)
    let counter = 1;
    while (existingIds.has(id)) {
      id = `py-${prefix}${String(levelCounts[lvl]).padStart(2, "0")}-gen${counter++}`;
    }
    existingIds.add(id);

    rows.push({
      id,
      level: lvl,
      category: String(c.category || "basic").slice(0, 40),
      title: String(c.title || "").slice(0, 100),
      scenario: String(c.scenario || ""),
      task: String(c.task || ""),
      starter_code: String(c.starter_code || ""),
      test_code: String(c.test_code || ""),
      hints: Array.isArray(c.hints) ? c.hints.slice(0, 10) : [],
      solution: c.solution ?? null,
      solution_explain: Array.isArray(c.solution_explain) ? c.solution_explain.slice(0, 10) : [],
      xp_award: typeof c.xp_award === "number" ? c.xp_award : 50,
      sort_order: sortOrder++,
      is_active: true,
    });
  }

  const { data, error } = await admin
    .from("nami_challenges")
    .insert(rows)
    .select("id, title, level");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // audit log
  try {
    await admin.from("audit_logs").insert({
      actor_id: user.id,
      actor_username: profile.username,
      action: "admin.nami_challenge_bulk_insert",
      target_type: "nami_challenge",
      changes: { count: rows.length, ids: rows.map((r) => r.id) },
    });
  } catch {}

  return NextResponse.json({ ok: true, inserted: data?.length ?? 0, ids: (data ?? []).map((r: any) => r.id) });
}
