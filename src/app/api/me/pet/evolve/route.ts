import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const COSTS: Record<string, number> = {
  baby: 0,
  child: 100,
  teen: 300,
  adult: 800,
  elder: 2000,
  legendary: 5000,
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const cost = Number(body.cost);
  if (!Number.isFinite(cost) || cost <= 0 || cost > 10000) {
    return NextResponse.json({ ok: false, error: "invalid_cost" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("evolve_pet", {
    p_user_id: user.id,
    p_z_cost: cost,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
