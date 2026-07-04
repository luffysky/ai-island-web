import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { equipCosmetic } from "@/lib/store-redeem";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { cosmeticId } → { ok } 裝備一件裝飾（同類型只能裝一件）。 */
export async function POST(req: NextRequest) {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const cosmeticId = String(b.cosmeticId ?? "");
  if (!cosmeticId) return NextResponse.json({ error: "validation", message: "缺 cosmeticId" }, { status: 422 });
  const r = await equipCosmetic(user.id, cosmeticId);
  if (!r.ok) return NextResponse.json({ error: r.error, message: r.error === "not_owned" ? "你還沒擁有這件裝飾" : "裝備失敗" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
