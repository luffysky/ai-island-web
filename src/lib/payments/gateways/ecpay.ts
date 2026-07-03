/**
 * 綠界 ECPay AIO 金流 adapter。
 * checkout：組 AIO 參數 + CheckMacValue（SHA256），回自動送出的表單。
 * verifyCallback：驗回調的 CheckMacValue，判斷 RtnCode==1 為成功。
 *
 * 需 env：ECPAY_MERCHANT_ID / ECPAY_HASH_KEY / ECPAY_HASH_IV
 * 測試機用 stage 網址；PAYMENTS_LIVE=1 才打正式。
 */
import crypto from "crypto";
import type { Order } from "../orders";
import type { PaymentMethod } from "../config";

const LIVE = process.env.PAYMENTS_LIVE === "1";
const ENDPOINT = LIVE
  ? "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5"
  : "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";

const CHOOSE: Record<PaymentMethod, string> = { credit: "Credit", atm: "ATM", cvs: "CVS", linepay: "Credit", applepay: "Credit" };

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://ai-island-web.snowrealm.pet").replace(/\/$/, "");
}

/** .NET 風格 urlencode（綠界指定）：encodeURIComponent → 小寫 → 特定字元還原。 */
function dotNetUrlEncode(s: string): string {
  return encodeURIComponent(s)
    .toLowerCase()
    .replace(/%20/g, "+")
    .replace(/%2d/g, "-")
    .replace(/%5f/g, "_")
    .replace(/%2e/g, ".")
    .replace(/%21/g, "!")
    .replace(/%2a/g, "*")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")");
}

export function ecpayCheckMac(params: Record<string, string>): string {
  const key = process.env.ECPAY_HASH_KEY || "";
  const iv = process.env.ECPAY_HASH_IV || "";
  const sorted = Object.keys(params).filter((k) => k !== "CheckMacValue").sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const query = sorted.map((k) => `${k}=${params[k]}`).join("&");
  const raw = `HashKey=${key}&${query}&HashIV=${iv}`;
  const encoded = dotNetUrlEncode(raw);
  return crypto.createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

function tradeDate(): string {
  // yyyy/MM/dd HH:mm:ss（綠界要求）
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function ecpayCheckout(order: Order): { kind: "form"; action: string; fields: Record<string, string> } {
  const method = (String(order.payment_method || "").split(":")[1] || "credit") as PaymentMethod;
  const params: Record<string, string> = {
    MerchantID: process.env.ECPAY_MERCHANT_ID || "",
    MerchantTradeNo: order.order_no,
    MerchantTradeDate: tradeDate(),
    PaymentType: "aio",
    TotalAmount: String(order.amount),
    TradeDesc: "AI island purchase",
    ItemName: order.product_name.slice(0, 200),
    ReturnURL: `${siteUrl()}/api/payments/webhook/ecpay`,
    ClientBackURL: `${siteUrl()}/store/result?no=${order.order_no}`,
    ChoosePayment: CHOOSE[method] || "Credit",
    EncryptType: "1",
  };
  params.CheckMacValue = ecpayCheckMac(params);
  return { kind: "form", action: ENDPOINT, fields: params };
}

/** 驗回調並回結果。綠界成功回 RtnCode=1、且 CheckMacValue 要對。 */
export function ecpayVerify(body: Record<string, string>): { ok: boolean; orderNo: string; gatewayRef: string; amount?: number } {
  const mac = ecpayCheckMac(body);
  const good = mac === String(body.CheckMacValue || "").toUpperCase();
  const success = String(body.RtnCode) === "1";
  return {
    ok: good && success,
    orderNo: String(body.MerchantTradeNo || ""),
    gatewayRef: String(body.TradeNo || ""),
    amount: body.TradeAmt != null ? Number(body.TradeAmt) : undefined,
  };
}
