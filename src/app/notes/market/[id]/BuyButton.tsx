"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, ShoppingBag, Check, StickyNote } from "lucide-react";

export function BuyButton({ productId, priceZ, loggedIn }: { productId: string; priceZ: number; loggedIn: boolean }) {
  const t = useTranslations("notes");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ copied: number; already: boolean } | null>(null);

  async function buy() {
    if (!loggedIn) { router.push(`/login?next=/notes/market/${productId}`); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/notes/products/${productId}/buy`, { method: "POST" });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.message || t("buyFailed"));
      setDone({ copied: Number(j.copied) || 0, already: !!j.already_owned });
      router.refresh(); // 重新載入 → 解鎖全文
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="text-right space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
          <Check size={15} />
          {done.already ? t("alreadyOwnedSynced") : t("addedToMyNotes", { n: done.copied })}
        </div>
        <div>
          <Link href="/me/notes" className="inline-flex items-center gap-1 text-sm text-accent hover:underline font-medium">
            <StickyNote size={14} /> {t("viewMyNotes")}
          </Link>
        </div>
      </div>
    );
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
