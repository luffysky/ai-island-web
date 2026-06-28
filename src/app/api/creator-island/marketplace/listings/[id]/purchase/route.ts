import { NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { purchaseListing } from "@/lib/creator-engine/marketplace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST → 用 Z 幣購買。{ ok } 或 402 餘額不足。 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const r = await purchaseListing(id, u.userId);
  if (!r?.ok) {
    const st = r?.error === "insufficient_funds" ? 402 : r?.error === "not_found" ? 404 : 409;
    return NextResponse.json({ error: r?.error ?? "purchase_failed", message: r?.error === "insufficient_funds" ? "Z 幣不足" : "購買失敗", ...r }, { status: st });
  }
  return NextResponse.json(r);
}
