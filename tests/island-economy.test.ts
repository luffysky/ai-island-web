import { describe, it, expect } from "vitest";
import { islandEarnedToday, capIslandReward, ISLAND_DAILY_ZCOIN_CAP } from "@/lib/island-economy";

// 模擬 supabase admin 查詢鏈：admin.from().select().eq().gt().or().gte() → 最後 await 回 { data }
function mockAdmin(rows: Array<{ amount: number }>) {
  const chain: any = {
    from: () => chain,
    select: () => chain,
    eq: () => chain,
    gt: () => chain,
    or: () => chain,
    gte: () => Promise.resolve({ data: rows }),
  };
  return chain;
}

describe("island-economy 伺服器權威每日上限", () => {
  it("islandEarnedToday 加總今天島嶼正向入帳", async () => {
    expect(await islandEarnedToday(mockAdmin([{ amount: 100 }, { amount: 50 }]), "u")).toBe(150);
    expect(await islandEarnedToday(mockAdmin([]), "u")).toBe(0);
  });

  it("還有額度時 capIslandReward 回完整獎勵", async () => {
    expect(await capIslandReward(mockAdmin([]), "u", 100)).toBe(100);
  });

  it("接近上限時只給剩餘空間", async () => {
    const used = ISLAND_DAILY_ZCOIN_CAP - 10;
    expect(await capIslandReward(mockAdmin([{ amount: used }]), "u", 100)).toBe(10);
  });

  it("已達上限回 0（擋住刷幣）", async () => {
    expect(await capIslandReward(mockAdmin([{ amount: ISLAND_DAILY_ZCOIN_CAP }]), "u", 100)).toBe(0);
    expect(await capIslandReward(mockAdmin([{ amount: ISLAND_DAILY_ZCOIN_CAP + 999 }]), "u", 100)).toBe(0);
  });

  it("want <= 0 直接回 0、不查 DB", async () => {
    expect(await capIslandReward(mockAdmin([]), "u", 0)).toBe(0);
    expect(await capIslandReward(mockAdmin([]), "u", -5)).toBe(0);
  });
});
