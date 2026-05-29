import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/me/mentor — 拿我的 profile + 找配對候選
 */
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data: mine } = await admin.from("mentor_profiles").select("*").eq("user_id", user.id).maybeSingle();

  // 找配對：我是 mentor → 找 mentee + peer / 我是 mentee → 找 mentor + peer / 我是 peer → 找 peer + mentor
  let candidates: any[] = [];
  if (mine) {
    const targetRoles = mine.role === "mentor" ? ["mentee", "peer"] : mine.role === "mentee" ? ["mentor", "peer"] : ["peer", "mentor"];
    const { data: others } = await admin
      .from("mentor_profiles")
      .select("user_id, role, bio, topics, availability, profiles!mentor_profiles_user_id_fkey(username, display_name, level, xp)")
      .neq("user_id", user.id)
      .eq("active", true)
      .in("role", targetRoles)
      .limit(20);
    // 簡單算 score = topic overlap
    const myTopics = new Set((mine.topics ?? []) as string[]);
    candidates = ((others ?? []) as any[]).map((o: any) => {
      const oTopics = new Set((o.topics ?? []) as string[]);
      let overlap = 0;
      for (const t of myTopics) if (oTopics.has(t)) overlap++;
      return {
        user_id: o.user_id,
        name: o.profiles?.display_name || o.profiles?.username || `user-${o.user_id.slice(0, 6)}`,
        level: o.profiles?.level ?? 1,
        role: o.role,
        bio: o.bio,
        topics: o.topics ?? [],
        availability: o.availability,
        overlap,
      };
    }).sort((a, b) => b.overlap - a.overlap);
  }

  return NextResponse.json({ ok: true, mine, candidates });
}

/**
 * POST /api/me/mentor — upsert mentor profile
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const role = ["mentor", "mentee", "peer"].includes(body.role) ? body.role : null;
  if (!role) return NextResponse.json({ error: "role 要 mentor / mentee / peer" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("mentor_profiles").upsert({
    user_id: user.id,
    role,
    bio: body.bio ? String(body.bio).slice(0, 500) : null,
    topics: Array.isArray(body.topics) ? body.topics.slice(0, 10).map((t: any) => String(t).slice(0, 30).toLowerCase()) : [],
    availability: body.availability ? String(body.availability).slice(0, 100) : null,
    contact_method: body.contact_method ? String(body.contact_method).slice(0, 100) : null,
    active: body.active !== false,
  }, { onConflict: "user_id" }).select("*").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, profile: data });
}

/** DELETE /api/me/mentor — 退出配對（active = false） */
export async function DELETE() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("mentor_profiles").update({ active: false }).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
