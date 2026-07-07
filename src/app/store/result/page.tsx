import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, Clock, XCircle, Coins } from "lucide-react";
import { getOrderByNo } from "@/lib/payments/orders";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("store");
  return { title: t("resultMetaTitle") };
}

export default async function ResultPage({ searchParams }: { searchParams: Promise<{ no?: string }> }) {
  const t = await getTranslations("store");
  const { no } = await searchParams;
  const order = no ? await getOrderByNo(no) : null;
  const status = order?.status ?? "unknown";
  const paid = status === "paid";
  const pending = status === "pending";

  return (
    <div className="max-w-md mx-auto px-6 py-16 text-center space-y-4">
      {paid ? (
        <>
          <CheckCircle2 size={56} className="mx-auto text-emerald-500" />
          <h1 className="text-2xl font-bold">{t("payOk")}</h1>
          <p className="text-fg-muted">{t("payOkDesc", { name: order?.product_name ?? "" })}</p>
        </>
      ) : pending ? (
        <>
          <Clock size={56} className="mx-auto text-amber-500" />
          <h1 className="text-2xl font-bold">{t("payPending")}</h1>
          <p className="text-fg-muted">{t("payPendingDesc")}</p>
        </>
      ) : (
        <>
          <XCircle size={56} className="mx-auto text-red-500" />
          <h1 className="text-2xl font-bold">{t("orderNotFound")}</h1>
          <p className="text-fg-muted">{t("orderNotFoundDesc")}</p>
        </>
      )}
      {order && <div className="text-xs text-fg-muted">{t("orderNo", { no: order.order_no })}</div>}
      <div className="flex items-center justify-center gap-2 pt-2">
        <Link href="/store" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-bg-card border border-border text-sm hover:text-accent"><Coins size={15} /> {t("backToStore")}</Link>
        <Link href="/creator-island" className="px-4 py-2 rounded-full bg-accent text-white text-sm">{t("backToIsland")}</Link>
      </div>
    </div>
  );
}
