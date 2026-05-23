import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  if (!body.subject || !body.body) return NextResponse.json({ error: "subject_body_required" }, { status: 400 });

  const { data, error } = await supabase.from("tickets").insert({
    user_id: user.id,
    subject: String(body.subject).slice(0, 200),
    body: String(body.body).slice(0, 5000),
    category: ["general","billing","bug","feature","complaint","refund","account"].includes(body.category) ? body.category : "general",
    priority: ["low","normal","high","urgent"].includes(body.priority) ? body.priority : "normal",
    email: user.email,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data?.id });
}
