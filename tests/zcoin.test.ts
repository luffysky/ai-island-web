import { describe, it, expect, vi } from "vitest";
import { makeMockAdmin } from "./helpers/mock-supabase";

// 只 mock supabase；測真正的 grantZcoinOnce 冪等判斷。
const h = vi.hoisted(() => ({ current: null as any }));
vi.mock("@/lib/supabase-admin", () => ({ createSupabaseAdmin: () => h.current }));

import { grantZcoinOnce } from "@/lib/zcoin";

describe("grantZcoinOnce — idempotency door", () => {
  it("skips crediting when an order_no was already recorded (no double credit)", async () => {
    // 第一個 await：existing lookup 回一筆 → 判定重複
    const { admin, calls } = makeMockAdmin([{ data: [{ id: "existing-tx" }] }]);
    h.current = admin;

    const r = await grantZcoinOnce("u1", 1000, "topup", "order-dup");
    expect(r).toEqual({ ok: true, duplicated: true });
    // 絕不能有第二次入帳：沒有 profiles.update、沒有 coin_transactions.insert
    expect(calls.update.length).toBe(0);
    expect(calls.insert.length).toBe(0);
  });

  it("credits exactly once on first sight and writes a ledger row", async () => {
    const { admin, calls } = makeMockAdmin([
      { data: [] }, // existing lookup → none
      { data: { z_coin: 100 } }, // current balance (.single)
      { data: null }, // profiles update
      { data: null }, // coin_transactions insert
    ]);
    h.current = admin;

    const r = await grantZcoinOnce("u1", 1000, "topup", "order-new", { amount_twd: 100 });
    expect(r).toEqual({ ok: true, balance: 1100 });
    expect(calls.insert.length).toBe(1);
    expect(calls.insert[0]).toMatchObject({ user_id: "u1", amount: 1000, balance_after: 1100, reason: "topup" });
    expect(calls.insert[0].meta).toMatchObject({ order_no: "order-new", amount_twd: 100 });
  });
});
