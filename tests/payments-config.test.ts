import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ZCOIN_PACKAGES,
  getZcoinPackage,
  PRO_PLANS,
  getProPlan,
  providerEnabled,
  enabledProviders,
  PROVIDER_METHODS,
  CURRENCY,
} from "@/lib/payments/config";

describe("payments/config — ZCOIN_PACKAGES", () => {
  it("twd and zcoin are strictly increasing across packages", () => {
    for (let i = 1; i < ZCOIN_PACKAGES.length; i++) {
      expect(ZCOIN_PACKAGES[i].twd).toBeGreaterThan(ZCOIN_PACKAGES[i - 1].twd);
      expect(ZCOIN_PACKAGES[i].zcoin).toBeGreaterThan(ZCOIN_PACKAGES[i - 1].zcoin);
    }
  });

  it("bonusPct is monotonically non-decreasing (越多送越多)", () => {
    for (let i = 1; i < ZCOIN_PACKAGES.length; i++) {
      expect(ZCOIN_PACKAGES[i].bonusPct).toBeGreaterThanOrEqual(ZCOIN_PACKAGES[i - 1].bonusPct);
    }
  });

  it("zcoin reflects the stated bonus over the 1:10 base (zcoin = twd*10*(1+bonusPct/100))", () => {
    for (const p of ZCOIN_PACKAGES) {
      const expected = p.twd * 10 * (1 + p.bonusPct / 100);
      expect(p.zcoin).toBeCloseTo(expected, 6);
    }
  });

  it("exactly one package is flagged popular", () => {
    expect(ZCOIN_PACKAGES.filter((p) => p.popular).length).toBe(1);
  });
});

describe("payments/config — lookups", () => {
  it("getZcoinPackage finds by id and returns undefined for unknown", () => {
    expect(getZcoinPackage("z500")?.twd).toBe(500);
    expect(getZcoinPackage("nope")).toBeUndefined();
  });

  it("getProPlan finds by id and returns undefined for unknown", () => {
    expect(getProPlan("pro_yearly")?.period).toBe("year");
    expect(getProPlan("pro_weekly")).toBeUndefined();
  });

  it("yearly plan is cheaper per month than monthly", () => {
    const monthly = getProPlan("pro_monthly")!;
    const yearly = getProPlan("pro_yearly")!;
    expect(yearly.perMonth).toBeLessThan(monthly.perMonth);
    expect(yearly.months).toBe(12);
    expect(PRO_PLANS.length).toBe(2);
  });
});

describe("payments/config — providerEnabled reflects env", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.ECPAY_MERCHANT_ID;
    delete process.env.ECPAY_HASH_KEY;
    delete process.env.ECPAY_HASH_IV;
    delete process.env.NEWEBPAY_MERCHANT_ID;
    delete process.env.NEWEBPAY_HASH_KEY;
    delete process.env.NEWEBPAY_HASH_IV;
    delete process.env.STRIPE_SECRET_KEY;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("ecpay disabled unless all three keys present", () => {
    expect(providerEnabled("ecpay")).toBe(false);
    process.env.ECPAY_MERCHANT_ID = "m";
    process.env.ECPAY_HASH_KEY = "k";
    expect(providerEnabled("ecpay")).toBe(false); // still missing IV
    process.env.ECPAY_HASH_IV = "iv";
    expect(providerEnabled("ecpay")).toBe(true);
  });

  it("stripe enabled with just the secret key", () => {
    expect(providerEnabled("stripe")).toBe(false);
    process.env.STRIPE_SECRET_KEY = "sk_test";
    expect(providerEnabled("stripe")).toBe(true);
  });

  it("enabledProviders lists only configured providers", () => {
    expect(enabledProviders()).toEqual([]);
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.NEWEBPAY_MERCHANT_ID = "m";
    process.env.NEWEBPAY_HASH_KEY = "k";
    process.env.NEWEBPAY_HASH_IV = "iv";
    expect(enabledProviders().sort()).toEqual(["newebpay", "stripe"]);
  });
});

describe("payments/config — shapes", () => {
  it("PROVIDER_METHODS has a method list for every provider and stripe is credit-only", () => {
    expect(Object.keys(PROVIDER_METHODS).sort()).toEqual(["ecpay", "lemonsqueezy", "newebpay", "paddle", "stripe"]);
    expect(PROVIDER_METHODS.stripe).toEqual(["credit"]);
    // MoR（海外）只收信用卡
    expect(PROVIDER_METHODS.lemonsqueezy).toEqual(["credit"]);
    expect(PROVIDER_METHODS.paddle).toEqual(["credit"]);
    for (const methods of Object.values(PROVIDER_METHODS)) {
      expect(methods.length).toBeGreaterThan(0);
      expect(methods).toContain("credit");
    }
  });

  it("currency is TWD", () => {
    expect(CURRENCY).toBe("TWD");
  });
});
