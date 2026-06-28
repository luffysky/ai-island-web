import { NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { getDustBalance, grantDailyDust } from "@/lib/creator-engine/dust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET → { balance } 取 Dust 餘額（順手發每日免費）。 */
export async function GET() {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const balance = await grantDailyDust(u.userId).catch(() => getDustBalance(u.userId));
  return NextResponse.json({ balance });
}
