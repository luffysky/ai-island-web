import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { newebpayVerify } from "@/lib/payments/gateways/newebpay";

// aes-256-cbc → key must be 32 bytes, iv 16 bytes
const KEY = "abcdefghijklmnopqrstuvwxyz123456"; // 32
const IV = "1234567890abcdef"; // 16

const saved = { ...process.env };
beforeEach(() => {
  process.env.NEWEBPAY_HASH_KEY = KEY;
  process.env.NEWEBPAY_HASH_IV = IV;
});
afterEach(() => {
  process.env = { ...saved };
});

// Mirror the gateway's own encoding so we can craft a valid callback body and
// exercise the public newebpayVerify (aesEncrypt/tradeSha are module-private).
function aesEncrypt(plain: string): string {
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(KEY, "utf8"), Buffer.from(IV, "utf8"));
  return cipher.update(plain, "utf8", "hex") + cipher.final("hex");
}
function tradeSha(cipherHex: string): string {
  return crypto
    .createHash("sha256")
    .update(`HashKey=${KEY}&${cipherHex}&HashIV=${IV}`)
    .digest("hex")
    .toUpperCase();
}

describe("newebpay tradeSha (mirrored) is deterministic given fixed env", () => {
  it("same cipher text → same sha, different → different", () => {
    const a = aesEncrypt(JSON.stringify({ Status: "SUCCESS" }));
    expect(tradeSha(a)).toBe(tradeSha(a));
    expect(tradeSha(a)).toMatch(/^[0-9A-F]{64}$/);
    const b = aesEncrypt(JSON.stringify({ Status: "FAIL" }));
    expect(tradeSha(a)).not.toBe(tradeSha(b));
  });
});

describe("newebpayVerify round-trip", () => {
  function makeBody(payload: unknown) {
    const tradeInfo = aesEncrypt(JSON.stringify(payload));
    return { TradeInfo: tradeInfo, TradeSha: tradeSha(tradeInfo) } as Record<string, string>;
  }

  it("accepts a well-formed SUCCESS callback and extracts fields", () => {
    const body = makeBody({
      Status: "SUCCESS",
      Result: { MerchantOrderNo: "order-9", TradeNo: "np-123", Amt: 500 },
    });
    const r = newebpayVerify(body);
    expect(r.ok).toBe(true);
    expect(r.orderNo).toBe("order-9");
    expect(r.gatewayRef).toBe("np-123");
    expect(r.amount).toBe(500);
  });

  it("rejects when Status is not SUCCESS", () => {
    const body = makeBody({ Status: "FAILED", Result: { MerchantOrderNo: "order-x" } });
    expect(newebpayVerify(body).ok).toBe(false);
  });

  it("rejects when TradeSha does not match TradeInfo (tampered)", () => {
    const body = makeBody({ Status: "SUCCESS", Result: {} });
    body.TradeSha = "DEADBEEF";
    expect(newebpayVerify(body).ok).toBe(false);
  });

  it("returns ok:false (no throw) on garbage TradeInfo", () => {
    const bad = { TradeInfo: "zzzz", TradeSha: tradeSha("zzzz") };
    expect(newebpayVerify(bad).ok).toBe(false);
  });
});
