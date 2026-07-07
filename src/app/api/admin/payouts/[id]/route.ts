import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { setPayoutStatus } from "@/lib/creator-engine/payout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { action: 'approved'|'paid'|'rejected', adminNote?, ntdAmount? } → 處理提現申請。 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const b = await req.json().catch(() => ({} as any));
  const action = b.action;
  if (!["approved", "paid", "rejected"].includes(action)) return NextResponse.json({ error: "bad_action" }, { status: 422 });
  const r = await setPayoutStatus(id, gate.userId, action, { adminNote: b.adminNote, ntdAmount: b.ntdAmount });
  if (!r.ok) return NextResponse.json(r, { status: 400 });
  return NextResponse.json(r);
}
