import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";
import { requestPayout } from "@/lib/creator-engine/payout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { fruitAmount, accountName, bankName, bankAccount } → 建立提現申請（先扣住果實）。 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized", message: "請先登入" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const r = await requestPayout(user.id, {
    fruitAmount: Number(b.fruitAmount),
    accountName: String(b.accountName ?? ""),
    bankName: String(b.bankName ?? ""),
    bankAccount: String(b.bankAccount ?? ""),
  });
  if (!r.ok) return NextResponse.json(r, { status: 400 });
  return NextResponse.json(r);
}
