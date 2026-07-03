import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { gradeReview } from "@/lib/srs";

export const runtime = "nodejs";

// POST /api/review/grade { id, correct }
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const id = String(body?.id ?? "").trim();
  const correct = Boolean(body?.correct);
  if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 422 });

  const r = await gradeReview(user.id, id, correct);
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, interval_days: r.interval_days, due_at: r.due_at });
}
