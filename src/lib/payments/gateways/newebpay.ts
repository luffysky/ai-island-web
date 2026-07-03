/**
 * 藍新 NewebPay MPG 金流 adapter。
 * checkout：把交易參數組成 query → AES-256-CBC 加密成 TradeInfo(hex) + SHA256 TradeSha，回自動送出表單。
 * verifyCallback：解密回調的 TradeInfo → 取 Status/Result。
 *
 * 需 env：NEWEBPAY_MERCHANT_ID / NEWEBPAY_HASH_KEY(32) / NEWEBPAY_HASH_IV(16)
 */
import crypto from "crypto";
import type { Order } from "../orders";

const LIVE = process.env.PAYMENTS_LIVE === "1";
const ENDPOINT = LIVE
  ? "https://core.newebpay.com/MPG/mpg_gateway"
  : "https://ccore.newebpay.com/MPG/mpg_gateway";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://ai-island-web.snowrealm.pet").replace(/\/$/, "");
}

function aesEncrypt(plain: string): string {
  const key = process.env.NEWEBPAY_HASH_KEY || "";
  const iv = process.env.NEWEBPAY_HASH_IV || "";
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
  return cipher.update(plain, "utf8", "hex") + cipher.final("hex");
}

function aesDecrypt(hex: string): string {
  const key = process.env.NEWEBPAY_HASH_KEY || "";
  const iv = process.env.NEWEBPAY_HASH_IV || "";
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
  decipher.setAutoPadding(false);
  const out = decipher.update(hex, "hex", "utf8") + decipher.final("utf8");
  // 去掉 PKCS7 尾端控制字元
  return out.replace(/[\x00-\x1f]+$/g, "");
}

function tradeSha(cipherHex: string): string {
  const key = process.env.NEWEBPAY_HASH_KEY || "";
  const iv = process.env.NEWEBPAY_HASH_IV || "";
  return crypto.createHash("sha256").update(`HashKey=${key}&${cipherHex}&HashIV=${iv}`).digest("hex").toUpperCase();
}

export function newebpayCheckout(order: Order): { kind: "form"; action: string; fields: Record<string, string> } {
  const trade: Record<string, string> = {
    MerchantID: process.env.NEWEBPAY_MERCHANT_ID || "",
    RespondType: "JSON",
    TimeStamp: String(Math.floor(Date.now() / 1000)),
    Version: "2.0",
    MerchantOrderNo: order.order_no,
    Amt: String(order.amount),
    ItemDesc: order.product_name.slice(0, 50),
    ReturnURL: `${siteUrl()}/api/payments/return/newebpay?no=${order.order_no}`,
    NotifyURL: `${siteUrl()}/api/payments/webhook/newebpay`,
    LoginType: "0",
  };
  const query = Object.entries(trade).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  const tradeInfo = aesEncrypt(query);
  return {
    kind: "form",
    action: ENDPOINT,
    fields: {
      MerchantID: trade.MerchantID,
      TradeInfo: tradeInfo,
      TradeSha: tradeSha(tradeInfo),
      Version: "2.0",
      EncryptType: "0",
    },
  };
}

export function newebpayVerify(body: Record<string, string>): { ok: boolean; orderNo: string; gatewayRef: string; amount?: number } {
  try {
    const tradeInfo = String(body.TradeInfo || "");
    // 驗 TradeSha
    if (String(body.TradeSha || "").toUpperCase() !== tradeSha(tradeInfo)) {
      return { ok: false, orderNo: "", gatewayRef: "" };
    }
    const json = JSON.parse(aesDecrypt(tradeInfo));
    const status = json.Status || body.Status;
    const result = json.Result || {};
    return {
      ok: status === "SUCCESS",
      orderNo: String(result.MerchantOrderNo || ""),
      gatewayRef: String(result.TradeNo || ""),
      amount: result.Amt != null ? Number(result.Amt) : undefined,
    };
  } catch {
    return { ok: false, orderNo: "", gatewayRef: "" };
  }
}
