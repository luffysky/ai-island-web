import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { authDevice } from "@/lib/agent/bridge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/agent/bridge/result  (Bearer <device token>) { callId, ok, result }
export async function POST(req: Request) {
  const device = await authDevice(req);
  if (!device) return NextResponse.json({ error: "invalid device token" }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  const callId = String(body.callId ?? "");
  if (!callId) return NextResponse.json({ error: "缺 callId" }, { status: 400 });
  const ok = body.ok !== false;
  const result = body.result ?? null;

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("agent_device_calls")
    .update({ status: ok ? "done" : "error", ok, result, finished_at: new Date().toISOString() })
    .eq("id", callId).eq("device_id", device.id).eq("status", "running");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
