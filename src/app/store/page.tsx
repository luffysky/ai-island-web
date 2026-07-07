import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getZcoinBalance } from "@/lib/zcoin";
import { isPro } from "@/lib/payments/orders";
import {
  ZCOIN_PACKAGES, PRO_PLANS, PRO_PERKS, enabledProviders, PROVIDER_METHODS,
  PROVIDER_LABEL, METHOD_LABEL, PROVIDER_FEE_NOTE,
} from "@/lib/payments/config";
import { getCatalog, listCosmetics } from "@/lib/store-redeem";
import { listWorkspaces } from "@/lib/creator-engine/workspace";
import { StoreClient } from "./StoreClient";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("store");
  return { title: t("metaTitle"), description: t("metaDesc") };
}

export default async function StorePage() {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/store");

  const [balance, pro, cosmetics, workspaces] = await Promise.all([
    getZcoinBalance(user.id), isPro(user.id), listCosmetics(user.id), listWorkspaces(user.id),
  ]);
  const providers = enabledProviders();
  // AI 額度加值目標：使用者是 Owner/Manager 的 studio 工作室
  const studios = workspaces.filter((w) => w.type === "studio" && (w.role === "owner" || w.role === "manager")).map((w) => ({ id: w.id, name: w.name }));

  return (
    <StoreClient
      balance={balance}
      isPro={pro}
      packages={ZCOIN_PACKAGES}
      plans={PRO_PLANS}
      perks={PRO_PERKS}
      providers={providers.map((p) => ({ id: p, label: PROVIDER_LABEL[p], fee: PROVIDER_FEE_NOTE[p], methods: PROVIDER_METHODS[p] }))}
      methodLabels={METHOD_LABEL}
      catalog={getCatalog()}
      cosmetics={cosmetics}
      studios={studios}
    />
  );
}
