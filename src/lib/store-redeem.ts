/**
 * 商店「花 Z 幣兌換」— catalog + 兌換/裝備。
 * 真實效果兩類：ai_credit（Z幣→工作室 wallet）、cosmetic（裝飾/稱號）。
 * 效果失敗會退款；cosmetic 不可重複擁有（先檢查再扣）。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { spendZcoin, grantZcoin } from "@/lib/zcoin";

export type CosmeticType = "title" | "name_color" | "avatar_frame";
export type StoreItem = {
  id: string;
  category: "ai_credit" | "cosmetic";
  name: string;
  desc: string;
  priceZ: number;
  effect:
    | { kind: "wallet_topup"; amount: number }
    | { kind: "cosmetic"; cosmeticType: CosmeticType; value: string };
};

export const STORE_CATALOG: StoreItem[] = [
  // 工作室 AI 額度加值（Z 幣 → 共用 AI 錢包，餵 Cost Manager）
  { id: "ai_credit_500", category: "ai_credit", name: "工作室 AI 額度 +500", desc: "把 500 Z 幣加進工作室共用 AI 錢包（團隊 AI 動作用）", priceZ: 500, effect: { kind: "wallet_topup", amount: 500 } },
  { id: "ai_credit_2000", category: "ai_credit", name: "工作室 AI 額度 +2000", desc: "把 2000 Z 幣加進工作室共用 AI 錢包", priceZ: 2000, effect: { kind: "wallet_topup", amount: 2000 } },
  // 稱號
  { id: "title_creator", category: "cosmetic", name: "稱號・創作者", desc: "在創作者島顯示「創作者」稱號", priceZ: 300, effect: { kind: "cosmetic", cosmeticType: "title", value: "創作者" } },
  { id: "title_dreamweaver", category: "cosmetic", name: "稱號・織夢人", desc: "顯示「織夢人」稱號", priceZ: 800, effect: { kind: "cosmetic", cosmeticType: "title", value: "織夢人" } },
  // 名稱顏色
  { id: "name_aurora", category: "cosmetic", name: "名稱顏色・極光", desc: "名字變成極光漸層色", priceZ: 500, effect: { kind: "cosmetic", cosmeticType: "name_color", value: "aurora" } },
  { id: "name_gold", category: "cosmetic", name: "名稱顏色・鎏金", desc: "名字變成鎏金色", priceZ: 500, effect: { kind: "cosmetic", cosmeticType: "name_color", value: "gold" } },
];

export function getCatalog(): StoreItem[] { return STORE_CATALOG; }
export function findItem(id: string): StoreItem | null { return STORE_CATALOG.find((i) => i.id === id) ?? null; }

export async function redeemItem(userId: string, itemId: string, opts: { workspaceId?: string } = {}): Promise<{ ok: boolean; error?: string; balance?: number }> {
  const item = findItem(itemId);
  if (!item) return { ok: false, error: "item_not_found" };
  const admin = createSupabaseAdmin();

  // 前置檢查（避免先扣款再退）
  if (item.effect.kind === "cosmetic") {
    const { data: owned } = await admin.from("ci_user_cosmetics").select("id").eq("user_id", userId).eq("cosmetic_id", item.id).maybeSingle();
    if (owned) return { ok: false, error: "already_owned" };
  }
  if (item.effect.kind === "wallet_topup" && !opts.workspaceId) return { ok: false, error: "workspace_required" };

  // 扣 Z 幣
  const paid = await spendZcoin(userId, item.priceZ, "store_redeem", { itemId });
  if (!paid.ok) return { ok: false, error: paid.error };

  // 套用效果，失敗退款
  try {
    if (item.effect.kind === "wallet_topup") {
      const r = await admin.rpc("ci_debit_workspace_wallet", { p_workspace_id: opts.workspaceId, p_user_id: userId, p_amount: item.effect.amount, p_reason: "store_ai_credit", p_meta: { itemId } });
      if (!(r.data as any)?.ok) throw new Error("wallet_credit_failed");
    } else {
      const { error } = await admin.from("ci_user_cosmetics").insert({ user_id: userId, cosmetic_id: item.id, cosmetic_type: item.effect.cosmeticType, value: item.effect.value });
      if (error) throw new Error(error.message);
    }
  } catch (e) {
    await grantZcoin(userId, item.priceZ, "store_refund", { itemId, err: (e as Error).message }).catch(() => {});
    return { ok: false, error: "effect_failed" };
  }

  await admin.from("ci_store_purchases").insert({ user_id: userId, item_id: item.id, z_spent: item.priceZ, meta: opts.workspaceId ? { workspaceId: opts.workspaceId } : {} }).then(() => {}, () => {});
  return { ok: true, balance: paid.balance };
}

export async function listCosmetics(userId: string) {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_user_cosmetics").select("cosmetic_id, cosmetic_type, value, equipped").eq("user_id", userId).order("acquired_at", { ascending: false });
  return (data as any[]) ?? [];
}

/** 裝備一件裝飾（同 type 只能裝一件；先卸下同 type 再裝上）。 */
export async function equipCosmetic(userId: string, cosmeticId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createSupabaseAdmin();
  const { data: c } = await admin.from("ci_user_cosmetics").select("cosmetic_type").eq("user_id", userId).eq("cosmetic_id", cosmeticId).maybeSingle();
  if (!c) return { ok: false, error: "not_owned" };
  const type = (c as any).cosmetic_type;
  await admin.from("ci_user_cosmetics").update({ equipped: false }).eq("user_id", userId).eq("cosmetic_type", type);
  await admin.from("ci_user_cosmetics").update({ equipped: true }).eq("user_id", userId).eq("cosmetic_id", cosmeticId);
  return { ok: true };
}

/** 目前裝備中的裝飾（給前台套用）。 */
export async function getEquippedCosmetics(userId: string): Promise<{ title?: string; name_color?: string; avatar_frame?: string }> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_user_cosmetics").select("cosmetic_type, value").eq("user_id", userId).eq("equipped", true);
  const out: Record<string, string> = {};
  for (const r of ((data as any[]) ?? [])) out[(r as any).cosmetic_type] = (r as any).value;
  return out;
}
