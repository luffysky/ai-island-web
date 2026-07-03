/** 依訂單的金流商分派 checkout。回自動送出表單或跳轉網址。 */
import { ecpayCheckout } from "./gateways/ecpay";
import { newebpayCheckout } from "./gateways/newebpay";
import { stripeCheckout } from "./gateways/stripe";
import type { Order } from "./orders";

export type CheckoutResult =
  | { kind: "form"; action: string; fields: Record<string, string> }
  | { kind: "redirect"; url: string };

export async function startCheckout(order: Order): Promise<CheckoutResult> {
  const provider = String(order.payment_method || "").split(":")[0];
  if (provider === "ecpay") return ecpayCheckout(order);
  if (provider === "newebpay") return newebpayCheckout(order);
  if (provider === "stripe") return await stripeCheckout(order);
  throw new Error("unknown_provider");
}

export * from "./config";
