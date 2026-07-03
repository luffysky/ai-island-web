import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getZcoinBalance } from "@/lib/zcoin";
import { isPro } from "@/lib/payments/orders";
import {
  ZCOIN_PACKAGES, PRO_PLANS, PRO_PERKS, enabledProviders, PROVIDER_METHODS,
  PROVIDER_LABEL, METHOD_LABEL, PROVIDER_FEE_NOTE,
} from "@/lib/payments/config";
import { StoreClient } from "./StoreClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "商店 · Z幣儲值 / Pro | AI 島", description: "儲值 Z幣、升級 Pro，解鎖更多 AI 與創作者功能。" };

export default async function StorePage() {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/store");

  const [balance, pro] = await Promise.all([getZcoinBalance(user.id), isPro(user.id)]);
  const providers = enabledProviders();

  return (
    <StoreClient
      balance={balance}
      isPro={pro}
      packages={ZCOIN_PACKAGES}
      plans={PRO_PLANS}
      perks={PRO_PERKS}
      providers={providers.map((p) => ({ id: p, label: PROVIDER_LABEL[p], fee: PROVIDER_FEE_NOTE[p], methods: PROVIDER_METHODS[p] }))}
      methodLabels={METHOD_LABEL}
    />
  );
}
