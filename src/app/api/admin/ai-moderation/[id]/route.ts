import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({} as any));
  const status = String(body.status ?? "");
  if (!["pending", "dismissed", "escalated", "resolved"].includes(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("ai_moderation_flags").update({
    status,
    resolved_at: status === "pending" ? null : new Date().toISOString(),
    resolved_by: status === "pending" ? null : user.id,
  }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
