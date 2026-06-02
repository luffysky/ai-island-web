import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("nami_challenges")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  return NextResponse.json({ challenges: data ?? [] });
}
