import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/opportunities/[id]/changes — 這個機會的欄位變動歷史（公開；截止/獎金/資格變動可回溯）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ changes: [] });
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("opportunity_changes")
    .select("id, field, old_value, new_value, source, detected_at")
    .eq("opportunity_id", id)
    .order("detected_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ changes: data ?? [] });
}
