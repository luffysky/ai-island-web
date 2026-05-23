import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({} as any));
  const content_md = String(body.content_md ?? "").trim();
  if (!content_md) return NextResponse.json({ error: "content_required" }, { status: 400 });

  // upsert（onConflict assignment_id+user_id）
  const { data, error } = await supabase
    .from("submissions")
    .upsert({
      assignment_id: id,
      user_id: user.id,
      content_md,
      submitted_at: new Date().toISOString(),
      // reset 評分（若重提交）
      score: null,
      feedback_md: null,
      graded_by: null,
      graded_at: null,
    }, { onConflict: "assignment_id,user_id" })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data?.id });
}
