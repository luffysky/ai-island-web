import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

type Action =
  | { kind: "set_role"; role: string }
  | { kind: "grant_xp"; amount: number; reason: string }
  | { kind: "grant_zcoin"; amount: number; reason: string }
  | { kind: "ban"; reason: string }
  | { kind: "unban" }
  | { kind: "toggle_ai_unlimited"; enabled: boolean };

const VALID_ROLES = new Set(["member", "editor", "admin", "teacher", "assistant"]);

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => ({} as any));
  const user_ids: string[] = Array.isArray(body.user_ids)
    ? body.user_ids.filter((s: any) => typeof s === "string").slice(0, 500)
    : [];
  if (user_ids.length === 0) return NextResponse.json({ error: "no_ids" }, { status: 400 });

  const action = body.action as Action;
  if (!action || typeof action.kind !== "string") return NextResponse.json({ error: "no_action" }, { status: 400 });

  const admin = createSupabaseAdmin();
  let success = 0;
  let failed = 0;

  for (const uid of user_ids) {
    try {
      switch (action.kind) {
        case "set_role":
          if (!VALID_ROLES.has(action.role)) throw new Error("invalid_role");
          await admin.from("profiles").update({ role: action.role }).eq("id", uid).throwOnError();
          break;
        case "grant_xp": {
          const amt = Number(action.amount);
          if (!Number.isFinite(amt) || amt === 0) throw new Error("invalid_amount");
          // 寫 xp_events + 更新 profile.xp
          await admin.from("xp_events").insert({ user_id: uid, amount: amt, reason: "admin_batch_grant_xp", meta: { reason: action.reason } }).throwOnError();
          const { data: cur } = await admin.from("profiles").select("xp").eq("id", uid).maybeSingle();
          const newXp = Math.max(0, (cur?.xp ?? 0) + amt);
          await admin.from("profiles").update({ xp: newXp }).eq("id", uid).throwOnError();
          break;
        }
        case "grant_zcoin": {
          const amt = Number(action.amount);
          if (!Number.isFinite(amt) || amt === 0) throw new Error("invalid_amount");
          const { data: cur } = await admin.from("profiles").select("z_coin").eq("id", uid).maybeSingle();
          const newBalance = Math.max(0, (cur?.z_coin ?? 0) + amt);
          await admin.from("profiles").update({ z_coin: newBalance }).eq("id", uid).throwOnError();
          await admin.from("coin_transactions").insert({
            user_id: uid, amount: amt, balance_after: newBalance,
            reason: "admin_batch_grant", meta: { reason: action.reason },
          }).throwOnError();
          break;
        }
        case "ban":
          await admin.from("profiles").update({ banned_at: new Date().toISOString() }).eq("id", uid).throwOnError();
          break;
        case "unban":
          await admin.from("profiles").update({ banned_at: null }).eq("id", uid).throwOnError();
          break;
        case "toggle_ai_unlimited":
          await admin.from("profiles").update({ ai_unlimited: action.enabled }).eq("id", uid).throwOnError();
          break;
        default:
          throw new Error("unknown_action");
      }
      success++;
    } catch (e) {
      failed++;
      console.warn(`[batch] ${uid} ${action.kind} failed:`, e);
    }
  }

  await admin.from("admin_events").insert({
    event_type: "users_batch_op",
    user_id: gate.userId,
    meta: { action, total: user_ids.length, success, failed },
  });

  return NextResponse.json({ ok: true, total: user_ids.length, success, failed });
}
