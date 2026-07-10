import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { newDeviceToken, hashToken } from "@/lib/agent/bridge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/agent/bridge/pair { name?, whitelist? } — 建立/配對一台裝置，回一次性 token（之後只存 hash）
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  const name = String(body.name ?? "我的電腦").slice(0, 40);

  const token = newDeviceToken();
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("agent_device_bridges")
    .insert({ user_id: user.id, name, platform: "windows", status: "offline", token_hash: hashToken(token) })
    .select("id, name").single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "配對失敗" }, { status: 500 });

  // token 只在這裡回一次，前端要提示使用者貼進桌面助手
  return NextResponse.json({ deviceId: data.id, name: data.name, token });
}
