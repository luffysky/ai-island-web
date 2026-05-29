import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Onboarding 進度 — 給 OnboardingTour / OnboardingWizard 共用
 *
 * GET  → 讀目前狀態
 * POST → 寫狀態（kind: 'tour' 或 'wizard'、後者帶 career / pet）
 */
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: p } = await supabase
    .from("profiles")
    .select("career_path, onboarding_pet_picked, onboarding_wizard_completed_at, onboarding_tour_completed_at, onboarding_starting_chapter")
    .eq("id", user.id)
    .maybeSingle();
  return NextResponse.json({
    career_path: (p as any)?.career_path ?? null,
    pet_picked: (p as any)?.onboarding_pet_picked ?? null,
    wizard_completed_at: (p as any)?.onboarding_wizard_completed_at ?? null,
    tour_completed_at: (p as any)?.onboarding_tour_completed_at ?? null,
    starting_chapter: (p as any)?.onboarding_starting_chapter ?? null,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  const admin = createSupabaseAdmin();
  const now = new Date().toISOString();
  const patch: Record<string, any> = {};
  if (body.kind === "tour") {
    patch.onboarding_tour_completed_at = now;
  } else if (body.kind === "wizard") {
    patch.onboarding_wizard_completed_at = now;
    if (body.career_path && typeof body.career_path === "string") {
      patch.career_path = body.career_path;
    }
    if (body.pet_picked && typeof body.pet_picked === "string") {
      patch.onboarding_pet_picked = body.pet_picked;
      // 也同步建寵物（如果還沒有）
      try {
        const { data: existing } = await admin.from("pets").select("id").eq("user_id", user.id).maybeSingle();
        if (!existing) {
          await admin.from("pets").insert({ user_id: user.id, species: body.pet_picked, walk_enabled: true, proactive_enabled: true });
        } else {
          await admin.from("pets").update({ species: body.pet_picked }).eq("user_id", user.id);
        }
      } catch {}
    }
    // 推薦起始章節對應
    const startMap: Record<string, number> = { frontend: 1, fullstack: 1, "ai-engineer": 46, data: 17, indie: 1, freelance: 37 };
    if (body.career_path && startMap[body.career_path]) {
      patch.onboarding_starting_chapter = startMap[body.career_path];
    }
  } else {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }
  const { error } = await admin.from("profiles").update(patch).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
