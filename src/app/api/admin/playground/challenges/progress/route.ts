import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("nami_challenge_progress")
    .select("*")
    .eq("user_id", gate.userId);

  return NextResponse.json({ progress: data ?? [] });
}
