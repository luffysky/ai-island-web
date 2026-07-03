import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ecpayCheckMac, ecpayVerify } from "@/lib/payments/gateways/ecpay";

const saved = { ...process.env };
beforeEach(() => {
  process.env.ECPAY_HASH_KEY = "5294y06JbISpM5x9";
  process.env.ECPAY_HASH_IV = "v77hoKGq4kWxNNIS";
});
afterEach(() => {
  process.env = { ...saved };
});

describe("ecpayCheckMac", () => {
  it("is deterministic for the same params", () => {
    const params = { MerchantID: "2000132", TotalAmount: "100", MerchantTradeNo: "abc123" };
    expect(ecpayCheckMac(params)).toBe(ecpayCheckMac(params));
  });

  it("produces an uppercase 64-char SHA256 hex digest", () => {
    const mac = ecpayCheckMac({ MerchantID: "2000132", TotalAmount: "100" });
    expect(mac).toMatch(/^[0-9A-F]{64}$/);
  });

  it("is insensitive to key insertion order (sorts case-insensitively)", () => {
    const a = { MerchantID: "2000132", TotalAmount: "100", ItemName: "x" };
    const b = { ItemName: "x", TotalAmount: "100", MerchantID: "2000132" };
    expect(ecpayCheckMac(a)).toBe(ecpayCheckMac(b));
  });

  it("ignores any incoming CheckMacValue field when computing", () => {
    const base = { MerchantID: "2000132", TotalAmount: "100" };
    const withMac = { ...base, CheckMacValue: "SHOULD_BE_IGNORED" };
    expect(ecpayCheckMac(withMac)).toBe(ecpayCheckMac(base));
  });

  it("changes when a value changes", () => {
    const a = ecpayCheckMac({ MerchantID: "2000132", TotalAmount: "100" });
    const b = ecpayCheckMac({ MerchantID: "2000132", TotalAmount: "101" });
    expect(a).not.toBe(b);
  });
});

describe("ecpayVerify", () => {
  it("returns ok only when RtnCode==1 AND the mac matches", () => {
    const body: Record<string, string> = {
      MerchantTradeNo: "order-1",
      TradeNo: "gw-1",
      TradeAmt: "100",
      RtnCode: "1",
    };
    body.CheckMacValue = ecpayCheckMac(body);
    const r = ecpayVerify(body);
    expect(r.ok).toBe(true);
    expect(r.orderNo).toBe("order-1");
    expect(r.gatewayRef).toBe("gw-1");
    expect(r.amount).toBe(100);
  });

  it("fails when the mac is tampered", () => {
    const body: Record<string, string> = { MerchantTradeNo: "order-2", RtnCode: "1" };
    body.CheckMacValue = ecpayCheckMac(body);
    body.CheckMacValue = body.CheckMacValue.slice(0, -1) + (body.CheckMacValue.endsWith("A") ? "B" : "A");
    expect(ecpayVerify(body).ok).toBe(false);
  });

  it("fails when RtnCode is not 1 even with a valid mac", () => {
    const body: Record<string, string> = { MerchantTradeNo: "order-3", RtnCode: "0" };
    body.CheckMacValue = ecpayCheckMac(body);
    expect(ecpayVerify(body).ok).toBe(false);
  });

  it("accepts a lowercase mac (verify uppercases before comparing)", () => {
    const body: Record<string, string> = { MerchantTradeNo: "order-4", RtnCode: "1" };
    body.CheckMacValue = ecpayCheckMac(body).toLowerCase();
    expect(ecpayVerify(body).ok).toBe(true);
  });
});
