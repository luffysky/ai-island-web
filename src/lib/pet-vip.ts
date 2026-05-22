// VIP 偵測 — 用 profile.id 識別、最穩、不靠 email / env 變動。
// IDs 從 supabase profiles 表 role='admin' 撈出。

export type VipTier = "luffy" | "nami" | "admin" | "user";

const LUFFY_ID = "2f39a49a-2035-487c-ba96-cef771751584";
const NAMI_ID = "3141dd52-1df6-4839-80dc-aabacd49ee16";

export function getVipTier(profile: { id?: string | null; role?: string | null } | null | undefined): VipTier {
  if (!profile?.id) return "user";
  if (profile.id === LUFFY_ID) return "luffy";
  if (profile.id === NAMI_ID) return "nami";
  if (profile.role === "admin") return "admin";
  return "user";
}

// 兩位老闆的對話泡泡都用 cute 樣式
export function usesCuteBubble(tier: VipTier): boolean {
  return tier === "luffy" || tier === "nami";
}

// luffy / nami 寵物的特殊光環
export function hasVipAura(tier: VipTier): boolean {
  return tier === "luffy" || tier === "nami";
}

// 寵物對 VIP 的稱呼池（隨機抽）
export function honorificsFor(tier: VipTier, displayName?: string | null): string[] {
  switch (tier) {
    case "luffy":
      return ["董事長", "老闆", "luffy", "林董", "頭家", "林老闆", "林總"];
    case "nami":
      return ["Nami 姊", "Nami 大人", "Nami", "Nami 教練", "親愛的 Nami"];
    case "admin":
      return [displayName || "管理員", "老闆"];
    default:
      return [displayName || "同學", "你"];
  }
}

export function pickHonorific(tier: VipTier, displayName?: string | null): string {
  const pool = honorificsFor(tier, displayName);
  return pool[Math.floor(Math.random() * pool.length)];
}
