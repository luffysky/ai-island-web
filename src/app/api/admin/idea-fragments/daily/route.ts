import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";
import { generateIdeaRows, fetchSurprisingPairs } from "@/lib/idea-ai";
import { likedStyleSummary } from "@/lib/idea-feedback";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;

// 用台北時區算「今天」，避免 UTC 跨日不準
function todayTaipei(): string {
  const now = new Date();
  const tpe = new Date(now.getTime() + 8 * 3600_000); // UTC+8
  return tpe.toISOString().slice(0, 10);
}

async function guard() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null as null, ok: false };
  const { data: profile } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  return { user, ok: profile?.role === "admin" || (profile as any)?.is_owner === true };
}

/** GET /api/admin/idea-fragments/daily → { idea: GeneratedIdea | null, date } 今天的點子（不生成） */
export async function GET() {
  const { ok } = await guard();
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const date = todayTaipei();
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("generated_ideas").select("*").eq("daily_date", date).maybeSingle();
  return NextResponse.json({ idea: data ?? null, date });
}

/**
 * POST /api/admin/idea-fragments/daily → 生成今天的點子（idempotent：當天已有就直接回）
 *   回 { idea, date, created: boolean }
 */
export async function POST(_req: NextRequest) {
  const { user, ok } = await guard();
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const date = todayTaipei();
  const admin = createSupabaseAdmin();

  // 已有今天的 → 直接回（不重複燒 token）
  const { data: existing } = await admin.from("generated_ideas").select("*").eq("daily_date", date).maybeSingle();
  if (existing) return NextResponse.json({ idea: existing, date, created: false });

  // 每位 user 每小時最多 5 次（手動戳）
  const rl = rateLimit(`idea-daily:${user!.id}`, 5, 3600_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", retry_after: rl.retryAfter }, { status: 429 });

  const { data: frags } = await admin
    .from("idea_fragments")
    .select("id, title, content, tags, mood, category")
    .order("created_at", { ascending: false })
    .limit(60);
  const fragments = (frags as any[]) ?? [];
  if (fragments.length < 2) {
    return NextResponse.json({ error: "not_enough_fragments", message: "至少要 2 個碎片" }, { status: 400 });
  }

  const [surprisingPairs, likedStyle] = await Promise.all([
    fetchSurprisingPairs({ count: 5 }),
    likedStyleSummary(),
  ]);
  const gen = await generateIdeaRows({ fragments, count: 1, userId: user!.id, surprisingPairs, likedStyle });
  if (!gen.ok) return NextResponse.json({ error: gen.error, message: gen.message, raw: gen.raw }, { status: gen.status });

  const row = { ...gen.rows[0], saved: true, daily_date: date };
  // 競態保護：唯一索引擋住重複；若剛好別人/別分頁同時插了、改回讀現有
  const { data: inserted, error } = await admin.from("generated_ideas").insert(row).select("*").single();
  if (error) {
    const { data: again } = await admin.from("generated_ideas").select("*").eq("daily_date", date).maybeSingle();
    if (again) return NextResponse.json({ idea: again, date, created: false });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ idea: inserted, date, created: true });
}
