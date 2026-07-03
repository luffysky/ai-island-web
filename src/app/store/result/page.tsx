import Link from "next/link";
import { CheckCircle2, Clock, XCircle, Coins } from "lucide-react";
import { getOrderByNo } from "@/lib/payments/orders";

export const dynamic = "force-dynamic";
export const metadata = { title: "付款結果 | AI 島" };

export default async function ResultPage({ searchParams }: { searchParams: Promise<{ no?: string }> }) {
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
          <h1 className="text-2xl font-bold">付款成功</h1>
          <p className="text-fg-muted">{order?.product_name} 已入帳。</p>
        </>
      ) : pending ? (
        <>
          <Clock size={56} className="mx-auto text-amber-500" />
          <h1 className="text-2xl font-bold">處理中</h1>
          <p className="text-fg-muted">若已完成付款，Z幣/Pro 會在數秒內入帳。可稍後重新整理。</p>
        </>
      ) : (
        <>
          <XCircle size={56} className="mx-auto text-red-500" />
          <h1 className="text-2xl font-bold">找不到訂單</h1>
          <p className="text-fg-muted">若你已付款但未入帳，請聯絡我們並提供訂單編號。</p>
        </>
      )}
      {order && <div className="text-xs text-fg-muted">訂單編號：{order.order_no}</div>}
      <div className="flex items-center justify-center gap-2 pt-2">
        <Link href="/store" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-bg-card border border-border text-sm hover:text-accent"><Coins size={15} /> 回商店</Link>
        <Link href="/creator-island" className="px-4 py-2 rounded-full bg-accent text-white text-sm">回島</Link>
      </div>
    </div>
  );
}
