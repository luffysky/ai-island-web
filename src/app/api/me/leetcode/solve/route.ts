import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const problemId = String(body.problem_id ?? "");
  if (!problemId) return NextResponse.json({ error: "missing_problem_id" }, { status: 400 });

  // ON CONFLICT 走 RLS、user_id = auth.uid()
  await supabase.from("user_leetcode_solved").upsert(
    { user_id: user.id, problem_id: problemId },
    { onConflict: "user_id,problem_id" }
  );

  return NextResponse.json({ ok: true });
}
