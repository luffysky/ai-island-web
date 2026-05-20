import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { userId } = await req.json();
  const admin = createSupabaseAdmin();

  // 凍結（不真的刪、加 banned 標記）
  await admin.from("profiles").update({ role: "member", bio: "[BANNED]" }).eq("id", userId);
  await admin.from("admin_events").insert({
    event_type: "user_banned",
    user_id: user.id,
    meta: { target_user_id: userId },
  });

  return NextResponse.json({ ok: true });
}
