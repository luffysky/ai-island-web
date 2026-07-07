import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getFruitBalance } from "@/lib/creator-engine/fruit";
import { listMyPayouts, PAYOUT } from "@/lib/creator-engine/payout";
import { PayoutClient } from "./PayoutClient";

export const dynamic = "force-dynamic";

export default async function PayoutPage() {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/creator-island/payout");
  const [balance, payouts] = await Promise.all([getFruitBalance(user.id), listMyPayouts(user.id)]);
  return <PayoutClient balance={balance} initialPayouts={payouts as any} cfg={PAYOUT} />;
}
