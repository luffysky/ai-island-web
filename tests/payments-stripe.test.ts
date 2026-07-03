import { describe, it, expect, vi } from "vitest";

// 用 holder 控制 constructEvent 的行為（簽章驗證是 Stripe SDK 的事、這裡只測我們的分支）。
const stripeState = vi.hoisted(() => ({
  impl: (_b: string, _s: string, _sec: string): any => {
    throw new Error("impl not set");
  },
}));

vi.mock("stripe", () => ({
  default: class {
    webhooks = { constructEvent: (b: string, s: string, sec: string) => stripeState.impl(b, s, sec) };
  },
}));

import { stripeVerify } from "@/lib/payments/gateways/stripe";

describe("stripeVerify — webhook signature gate", () => {
  it("throws when the signature is bad (constructEvent throws, not swallowed)", () => {
    stripeState.impl = () => {
      throw new Error("No signatures found matching the expected signature");
    };
    expect(() => stripeVerify("raw", "bad-sig")).toThrow();
  });

  it("returns ok only for a completed + paid checkout session", () => {
    stripeState.impl = () => ({
      type: "checkout.session.completed",
      data: {
        object: { payment_status: "paid", metadata: { order_no: "o1" }, payment_intent: "pi_1", amount_total: 10000 },
      },
    });
    expect(stripeVerify("raw", "sig")).toEqual({ ok: true, orderNo: "o1", gatewayRef: "pi_1", amount: 100 });
  });

  it("not ok when the session is unpaid", () => {
    stripeState.impl = () => ({
      type: "checkout.session.completed",
      data: { object: { payment_status: "unpaid", client_reference_id: "o2", id: "cs_2" } },
    });
    const r = stripeVerify("raw", "sig");
    expect(r.ok).toBe(false);
    expect(r.orderNo).toBe("o2");
  });

  it("not ok for unrelated event types", () => {
    stripeState.impl = () => ({ type: "payment_intent.created", data: { object: {} } });
    expect(stripeVerify("raw", "sig")).toEqual({ ok: false, orderNo: "", gatewayRef: "" });
  });
});
