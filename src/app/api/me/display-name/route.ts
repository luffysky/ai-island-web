import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { displayName } → 設定顯示名稱 + 標記 display_name_set=true。 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({} as any));
  const displayName = String(b.displayName ?? "").trim().slice(0, 40);
  if (displayName.length < 1) return NextResponse.json({ error: "name_required", message: "請輸入顯示名稱" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("profiles")
    .update({ display_name: displayName, display_name_set: true })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
