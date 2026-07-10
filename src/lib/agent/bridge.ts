// Agent 平台 Phase 1b — 桌面助手 Bridge：token、裝置狀態、本機工具佇列調度。
import { createHash, randomBytes } from "node:crypto";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import type { ToolResult } from "./tools";

const ONLINE_WINDOW_MS = 35_000;        // last_seen 在此秒數內視為在線（Bridge 每 ~5s 輪詢）

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
export function newDeviceToken(): string {
  return "isb_" + randomBytes(24).toString("hex");   // island-bridge token
}

/** 用 Bearer token 認證 Bridge。回裝置或 null。 */
export async function authDevice(req: Request): Promise<{ id: string; user_id: string; name: string; whitelist: any } | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("agent_device_bridges")
    .select("id, user_id, name, whitelist, revoked")
    .eq("token_hash", hashToken(token)).single();
  if (!data || data.revoked) return null;
  return data;
}

/** 找使用者目前在線的一台裝置（last_seen 夠新、未撤銷、已配對）。 */
export async function getOnlineDevice(userId: string): Promise<{ id: string; name: string } | null> {
  const admin = createSupabaseAdmin();
  const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
  const { data } = await admin.from("agent_device_bridges")
    .select("id, name, last_seen_at")
    .eq("user_id", userId).eq("revoked", false).not("token_hash", "is", null)
    .gte("last_seen_at", since).order("last_seen_at", { ascending: false }).limit(1);
  return data && data[0] ? { id: data[0].id, name: data[0].name } : null;
}

export function isOnline(lastSeenAt?: string | null): boolean {
  return !!lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS;
}

/** orchestrator 用：把需本機的工具丟進佇列、輪詢等 Bridge 回結果。 */
export async function dispatchToDevice(
  taskId: string, userId: string, deviceId: string, stepIdx: number,
  toolName: string, args: unknown, timeoutMs = 120_000,
): Promise<ToolResult> {
  const admin = createSupabaseAdmin();
  const { data: call, error } = await admin.from("agent_device_calls")
    .insert({ task_id: taskId, user_id: userId, device_id: deviceId, step_idx: stepIdx, tool_name: toolName, args: args ?? {} })
    .select("id").single();
  if (error || !call) return { ok: false, error: "無法建立本機工具呼叫：" + (error?.message ?? "") };

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1200));
    const { data } = await admin.from("agent_device_calls").select("status, ok, result").eq("id", call.id).single();
    if (data?.status === "done") return { ok: data.ok !== false, data: data.result };
    if (data?.status === "error") return { ok: false, error: (data.result as any)?.error ?? "本機執行失敗" };
    // 任務被取消 → 停止等待
    const { data: t } = await admin.from("agent_tasks").select("status").eq("id", taskId).single();
    if (t?.status === "cancelled") return { ok: false, error: "任務已取消" };
  }
  await admin.from("agent_device_calls").update({ status: "error", result: { error: "逾時" } }).eq("id", call.id).eq("status", "pending");
  return { ok: false, error: "桌面助手逾時未回應（可能已離線）" };
}
