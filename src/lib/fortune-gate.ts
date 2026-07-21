/**
 * 運勢/命理功能的統一付費 gate（共用「免費每日 1 次 · 付費無限」邏輯）。
 * 付費 = ai_unlimited / admin / owner（hasAiUnlimited）或有任一有效訂閱（getUserSubTier）。
 * 用 fortune_daily 的唯一鍵 (user_id,date,kind) 當「今天用過沒」的依據。
 * ＊命理供參考娛樂，這裡只管「誰能用幾次 AI 深解」，不管準不準。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { hasAiUnlimited } from "@/lib/ai-privilege";
import { getUserSubTier } from "@/lib/payments/orders";
import { taipeiToday } from "@/lib/fortune-service";

export async function isFortunePaid(userId: string): Promise<boolean> {
  const [unlimited, subTier] = await Promise.all([hasAiUnlimited(userId), getUserSubTier(userId)]);
  return unlimited || !!subTier;
}

export type FortuneGate = {
  paid: boolean;
  /** 今天這個 kind 是否還能跑 AI（付費永遠 true；免費看今天用過沒） */
  aiAllowed: boolean;
  /** 今天已存的 payload（免費用戶第二次來回顯用），沒有則 null */
  existing: unknown | null;
  date: string;
  admin: ReturnType<typeof createSupabaseAdmin>;
};

/**
 * 讀一個運勢 kind（tarot/iching/bazi…）今天的付費/用量狀態。
 * 免費：一天一次 AI；付費：無限。casting/本地結果不受此限（呼叫端自行免費給）。
 */
export async function getFortuneGate(userId: string, kind: string): Promise<FortuneGate> {
  const paid = await isFortunePaid(userId);
  const admin = createSupabaseAdmin();
  const date = taipeiToday();
  const { data } = await admin
    .from("fortune_daily")
    .select("payload")
    .eq("user_id", userId).eq("date", date).eq("kind", kind)
    .maybeSingle();
  const existing = (data?.payload ?? null) as unknown | null;
  return { paid, aiAllowed: paid || !existing, existing, date, admin };
}
