/**
 * Creator Engine — Dust（M4）：創作資源，非金錢（與 coin_transactions 分開、ADR-004）。
 * 每日免費發放 + 開碎片蛋消耗。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createFragment } from "@/lib/creator-engine/fragments";

const DAILY_FREE = 3;

export async function getDustBalance(userId: string): Promise<number> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_dust_ledger").select("balance_after").eq("user_id", userId).order("id", { ascending: false }).limit(1).maybeSingle();
  return Number((data as any)?.balance_after ?? 0);
}

/** 每日免費 Dust（同一天只發一次）。回傳發放後餘額。 */
export async function grantDailyDust(userId: string): Promise<number> {
  const admin = createSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);
  const { data: last } = await admin.from("ci_dust_ledger")
    .select("created_at").eq("user_id", userId).eq("reason", "daily_free")
    .order("id", { ascending: false }).limit(1).maybeSingle();
  if ((last as any)?.created_at?.slice(0, 10) === today) return getDustBalance(userId);
  await admin.rpc("ci_dust_tx", { p_user_id: userId, p_amount: DAILY_FREE, p_reason: "daily_free", p_meta: { day: today } });
  return getDustBalance(userId);
}

const EGG_POOL = [
  "如果這個城市的雨會記得每個淋濕的人……",
  "把『再見』寫成一個只有兩個人懂的暗號",
  "一個總是準時壞掉的鬧鐘，其實在保護主人",
  "深夜便利商店店員的第 1000 個觀察",
  "如果情緒可以存進隨身碟，你會刪掉哪一段？",
  "童年那條回家的路，少了哪一個轉角就不是家",
  "一首歌的副歌，是整首歌偷偷想說的那句話",
  "把一個產品點子，講給五歲的自己聽",
];

/** 開碎片蛋：扣 1 Dust → 從碎片庫抽 1 顆（扭蛋式，SSR 稀有）。回傳含 rarity。 */
export async function openEgg(workspaceId: string, userId: string): Promise<{ ok: boolean; fragment?: any; rarity?: string; balance?: number; error?: string }> {
  await grantDailyDust(userId); // 順手發每日免費
  const admin = createSupabaseAdmin();
  const r = await admin.rpc("ci_dust_tx", { p_user_id: userId, p_amount: -1, p_reason: "egg_open", p_meta: { workspaceId } });
  const res = r.data as { ok: boolean; error?: string; balance_after?: number };
  if (!res?.ok) return { ok: false, error: res?.error ?? "insufficient_dust" };

  // 從池加權抽 1（SSR≈3% / SR≈17% / R）
  const { data: pool } = await admin.rpc("ci_draw_from_pool", { p_n: 1, p_ssr: 0, p_sr: 0 });
  const roll = Math.floor((Date.now() / 7) % 100);
  const rarityWant = roll < 3 ? "SSR" : roll < 20 ? "SR" : "R";
  const { data: picked } = await admin.from("ci_fragment_pool").select("text, category, rarity, tags").eq("rarity", rarityWant).order("created_at", { ascending: false }).limit(50);
  const cands = (picked as any[]) ?? (pool as any[]) ?? [];
  const chosen = cands.length ? cands[Math.floor((Date.now() / 13) % cands.length)] : null;

  const title = chosen?.text ?? EGG_POOL[Math.floor((Date.now() / 1000) % EGG_POOL.length)];
  const rarity = chosen?.rarity ?? "R";
  const fragment = await createFragment(workspaceId, userId, {
    title, category: chosen?.category ?? undefined, tags: [rarity, "碎片蛋", ...(chosen?.tags ?? [])].slice(0, 4), sourceType: "egg_generated",
  });
  return { ok: true, fragment, rarity, balance: res.balance_after };
}
