import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { isOnline } from "@/lib/agent/bridge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/agent/devices — 我配對過的裝置 + 在線狀態
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("agent_device_bridges")
    .select("id, name, platform, last_seen_at, created_at")
    .eq("user_id", user.id).eq("revoked", false).order("created_at", { ascending: false });
  const devices = (data ?? []).map((d) => ({ ...d, online: isOnline(d.last_seen_at) }));
  return NextResponse.json({ devices });
}

// POST /api/agent/devices { action:"revoke", deviceId } — 解除配對
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  if (body.action !== "revoke" || !body.deviceId) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("agent_device_bridges")
    .update({ revoked: true, status: "offline" }).eq("id", body.deviceId).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
