import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => ({} as any));
  const f = body.filter_json ?? {};
  const admin = createSupabaseAdmin();
  let q = admin.from("profiles").select("*", { count: "exact", head: true }) as any;
  if (typeof f.xp_gte === "number") q = q.gte("xp", f.xp_gte);
  if (typeof f.level_gte === "number") q = q.gte("level", f.level_gte);
  if (typeof f.role === "string") q = q.eq("role", f.role);
  q = q.is("banned_at", null);
  const { count } = await q;
  return NextResponse.json({ count: count ?? 0 });
}
