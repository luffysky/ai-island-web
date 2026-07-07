"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, ShoppingBag } from "lucide-react";

export function BuyButton({ productId, priceZ, loggedIn }: { productId: string; priceZ: number; loggedIn: boolean }) {
  const t = useTranslations("notes");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function buy() {
    if (!loggedIn) { router.push(`/login?next=/notes/market/${productId}`); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/notes/products/${productId}/buy`, { method: "POST" });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.message || t("buyFailed"));
      router.refresh(); // 重新載入 → 解鎖全文
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="text-right">
      <button onClick={buy} disabled={busy} className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-accent text-black font-bold disabled:opacity-40">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={16} />}
        {priceZ === 0 ? t("getFree") : t("buyWithCoins", { n: priceZ })}
      </button>
      {err && <div className="text-xs text-red-500 mt-1">{err}</div>}
    </div>
  );
}
