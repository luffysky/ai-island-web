import { NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { getFruitBalance, listFruitLedger } from "@/lib/creator-engine/fruit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET → { balance, ledger } 目前使用者的果實餘額 + 最近帳。 */
export async function GET() {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const [balance, ledger] = await Promise.all([getFruitBalance(u.userId), listFruitLedger(u.userId, 50)]);
  return NextResponse.json({ balance, ledger });
}
