import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { listCosmetics } from "@/lib/store-redeem";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET → { cosmetics } 我擁有的裝飾（含 equipped）。 */
export async function GET() {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ cosmetics: await listCosmetics(user.id) });
}
