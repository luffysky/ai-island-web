import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { revokeVipRole } from "@/lib/discord-binding";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data: bind } = await admin.from("user_discord_bind").select("discord_user_id").eq("user_id", user.id).maybeSingle();
  if (bind?.discord_user_id) {
    await revokeVipRole((bind as any).discord_user_id).catch(() => false);
  }
  await admin.from("user_discord_bind").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
