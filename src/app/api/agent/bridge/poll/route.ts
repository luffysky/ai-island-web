import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { authDevice } from "@/lib/agent/bridge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/agent/bridge/poll  (Bearer <device token>)
// 心跳（更新 last_seen=在線）+ 領取待辦本機工具呼叫（pending→running），回給 Bridge 執行。
export async function GET(req: Request) {
  const device = await authDevice(req);
  if (!device) return NextResponse.json({ error: "invalid device token" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const now = new Date().toISOString();
  await admin.from("agent_device_bridges").update({ last_seen_at: now, status: "online" }).eq("id", device.id);

  const { data: calls } = await admin.from("agent_device_calls")
    .select("id, tool_name, args, task_id, step_idx")
    .eq("device_id", device.id).eq("status", "pending").order("created_at").limit(3);

  const claimed: any[] = [];
  for (const c of calls ?? []) {
    // 樂觀鎖：只在仍 pending 時搶下（避免重複執行）
    const { data: upd } = await admin.from("agent_device_calls")
      .update({ status: "running", claimed_at: now }).eq("id", c.id).eq("status", "pending").select("id").single();
    if (upd) claimed.push({ id: c.id, tool: c.tool_name, args: c.args });
  }
  return NextResponse.json({ calls: claimed, whitelist: device.whitelist ?? {} });
}
