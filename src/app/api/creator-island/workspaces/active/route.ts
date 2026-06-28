import { NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { getActiveWorkspace } from "@/lib/creator-engine/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET → { workspace } 取得 active workspace（首次 lazy-create Personal）。 */
export async function GET() {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const workspace = await getActiveWorkspace(u.userId);
  return NextResponse.json({ workspace });
}
