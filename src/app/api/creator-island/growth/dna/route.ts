import { NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { computeDNA, getDNA } from "@/lib/creator-engine/growth";
import { getActiveWorkspace } from "@/lib/creator-engine/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** GET → { dna } */
export async function GET() {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  return NextResponse.json({ dna: await getDNA(u.userId) });
}

/** POST → 重算創作 DNA。{ traits } 或 { error } */
export async function POST() {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const ws = await getActiveWorkspace(u.userId);
  const r = await computeDNA(u.userId, ws.id);
  if ("error" in r) return NextResponse.json({ error: r.error, message: r.error === "samples_too_few" ? "素材太少，先多寫幾個碎片/作品" : "產生失敗" }, { status: 422 });
  return NextResponse.json({ traits: r.traits });
}
