import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockAdmin } from "./helpers/mock-supabase";

// 用可切換的 admin holder 讓每個 test 餵不同 DB 回傳。
const h = vi.hoisted(() => ({ current: null as any }));
vi.mock("@/lib/supabase-admin", () => ({ createSupabaseAdmin: () => h.current }));

// zcoin 是「發貨」副作用 — 用 spy 確認有沒有被叫（不重複入帳）。
const grantMock = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock("@/lib/zcoin", () => ({ grantZcoinOnce: (...a: any[]) => grantMock.fn(...a) }));

import { fulfillOrder } from "@/lib/payments/orders";

beforeEach(() => {
  grantMock.fn.mockReset();
  grantMock.fn.mockResolvedValue({ ok: true, balance: 1000 });
});

function order(overrides: Record<string, any> = {}) {
  return {
    id: "row-1",
    user_id: "u1",
    order_no: "o1",
    product_type: "zcoin_topup",
    product_name: "Z幣 1,000",
    amount: 100,
    currency: "TWD",
    status: "pending",
    payment_method: "ecpay:credit",
    metadata: { zcoin: 1000 },
    ...overrides,
  };
}

describe("fulfillOrder — the money door", () => {
  it("rejects when the order does not exist", async () => {
    const { admin } = makeMockAdmin([{ data: null }]);
    h.current = admin;
    const r = await fulfillOrder("nope", "gw");
    expect(r).toEqual({ ok: false, error: "order_not_found" });
    expect(grantMock.fn).not.toHaveBeenCalled();
  });

  it("is idempotent: already-paid short-circuits, no double credit", async () => {
    const { admin, calls } = makeMockAdmin([{ data: order({ status: "paid" }) }]);
    h.current = admin;
    const r = await fulfillOrder("o1", "gw");
    expect(r).toEqual({ ok: true, already: true });
    expect(calls.update.length).toBe(0); // never re-writes the order
    expect(grantMock.fn).not.toHaveBeenCalled(); // never re-grants coins
  });

  it("rejects on amount_mismatch and does NOT fulfill", async () => {
    const { admin, calls } = makeMockAdmin([{ data: order({ amount: 100 }) }]);
    h.current = admin;
    const r = await fulfillOrder("o1", "gw", 50); // gateway reported 50 ≠ 100
    expect(r).toEqual({ ok: false, error: "amount_mismatch" });
    expect(calls.update.length).toBe(0);
    expect(grantMock.fn).not.toHaveBeenCalled();
  });

  it("fulfills a matching zcoin order: marks paid + grants the exact zcoin once", async () => {
    const { admin, calls } = makeMockAdmin([
      { data: order() }, // getOrderByNo
      { data: null }, // orders update
    ]);
    h.current = admin;
    const r = await fulfillOrder("o1", "gw-777", 100);
    expect(r).toEqual({ ok: true });
    expect(calls.update.length).toBe(1);
    expect(calls.update[0]).toMatchObject({ status: "paid", payment_id: "gw-777" });
    expect(grantMock.fn).toHaveBeenCalledTimes(1);
    expect(grantMock.fn).toHaveBeenCalledWith("u1", 1000, "topup", "o1", { amount_twd: 100 });
  });

  it("accepts when no paidAmount is supplied (skip amount guard)", async () => {
    const { admin } = makeMockAdmin([{ data: order() }, { data: null }]);
    h.current = admin;
    const r = await fulfillOrder("o1", "gw-1"); // no amount → guard skipped
    expect(r).toEqual({ ok: true });
    expect(grantMock.fn).toHaveBeenCalledTimes(1);
  });
});
