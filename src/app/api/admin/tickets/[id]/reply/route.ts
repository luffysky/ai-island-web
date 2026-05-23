import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin","teacher","assistant"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({} as any));
  const text = String(body.body ?? "").trim();
  if (!text) return NextResponse.json({ error: "body_required" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("ticket_messages").insert({
    ticket_id: id,
    author_id: user.id,
    is_staff: true,
    body: text.slice(0, 5000),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("tickets").update({
    status: "waiting_user",
    assigned_to: user.id,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  return NextResponse.json({ ok: true });
}
