import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServer } from "@/lib/supabase-server";

function buildUsername(user: { id: string; email?: string; user_metadata?: Record<string, any> }) {
  const raw =
    user.user_metadata?.username ||
    user.user_metadata?.preferred_username ||
    user.user_metadata?.name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "user";

  const base = String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);

  const safeBase = base.length >= 3 ? base : "user";
  return `${safeBase}_${user.id.slice(0, 8)}`.slice(0, 30);
}

function buildDisplayName(user: { email?: string; user_metadata?: Record<string, any> }) {
  return (
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.username ||
    user.email?.split("@")[0] ||
    "AI 島民"
  );
}

export async function POST() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "service_role_not_configured" }, { status: 500 });
  }

  const admin = createSupabaseAdmin();
  const { data: existing, error: selectError } = await admin
    .from("profiles")
    .select("id, display_name_set")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 });
  }

  // OAuth（Google/LINE…）登入：不直接用第三方真名當顯示名稱，先給中性的 username、
  // 標記 display_name_set=false → 首次登入導去 onboarding 讓本人自己填。
  const provider = (user.app_metadata as any)?.provider || "email";
  const isOAuth = provider !== "email";

  if (!existing) {
    const username = buildUsername(user);
    const { error: insertError } = await admin.from("profiles").insert({
      id: user.id,
      username,
      display_name: isOAuth ? username : buildDisplayName(user),
      display_name_set: !isOAuth,
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      xp: 0,
      z_coin: 100,
      hearts: 5,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, needsDisplayName: isOAuth });
  }

  return NextResponse.json({ ok: true, needsDisplayName: (existing as any).display_name_set === false });
}
