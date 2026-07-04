import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { redeemItem, findItem } from "@/lib/store-redeem";
import { getWorkspaceRole, roleAtLeast } from "@/lib/creator-engine/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MSG: Record<string, string> = {
  item_not_found: "找不到這個品項",
  already_owned: "你已經擁有這個裝飾了",
  workspace_required: "請先選擇要加值的工作室",
  insufficient_coins: "Z 幣不足",
  forbidden: "只有工作室的 Owner/Manager 能加值 AI 額度",
  effect_failed: "兌換失敗，已退還 Z 幣",
};

/** POST { itemId, workspaceId? } → { ok, balance } 花 Z 幣兌換。 */
export async function POST(req: NextRequest) {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const itemId = String(b.itemId ?? "");
  const item = findItem(itemId);
  if (!item) return NextResponse.json({ error: "item_not_found", message: MSG.item_not_found }, { status: 404 });

  // AI 額度加值：必須是該工作室的 Owner/Manager
  const workspaceId = b.workspaceId ? String(b.workspaceId) : undefined;
  if (item.effect.kind === "wallet_topup") {
    if (!workspaceId) return NextResponse.json({ error: "workspace_required", message: MSG.workspace_required }, { status: 422 });
    const role = await getWorkspaceRole(workspaceId, user.id);
    if (!roleAtLeast(role, "manager")) return NextResponse.json({ error: "forbidden", message: MSG.forbidden }, { status: 403 });
  }

  const r = await redeemItem(user.id, itemId, { workspaceId });
  if (!r.ok) {
    const st = r.error === "insufficient_coins" ? 402 : r.error === "already_owned" ? 409 : 400;
    return NextResponse.json({ error: r.error, message: MSG[r.error as string] ?? "兌換失敗" }, { status: st });
  }
  return NextResponse.json({ ok: true, balance: r.balance });
}
