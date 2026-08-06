import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COLS = ["line_notify_enabled", "line_pref_daily_brief", "line_pref_deadlines", "line_pref_subscriptions", "line_pref_agent", "line_pref_learning", "line_pref_fortune"] as const;

// GET — 我的 LINE 通知偏好
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("profiles").select(`line_user_id, ${COLS.join(", ")}`).eq("id", user.id).maybeSingle();
  const bound = !!(data as any)?.line_user_id;
  const prefs: Record<string, boolean> = {};
  for (const c of COLS) prefs[c] = (data as any)?.[c] !== false;
  return NextResponse.json({ bound, prefs });
}

// PUT { line_pref_deadlines?, ... } — 更新偏好
export async function PUT(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const patch: Record<string, boolean> = {};
  for (const c of COLS) if (typeof b[c] === "boolean") patch[c] = b[c];
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "沒有可更新的欄位" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("profiles").update(patch).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
