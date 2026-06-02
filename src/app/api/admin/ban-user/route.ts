import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-guard";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { userId } = await req.json();
  const admin = createSupabaseAdmin();

  // 凍結（不真的刪、加 banned 標記）
  await admin.from("profiles").update({ role: "member", bio: "[BANNED]" }).eq("id", userId);
  await admin.from("admin_events").insert({
    event_type: "user_banned",
    user_id: gate.userId,
    meta: { target_user_id: userId },
  });

  return NextResponse.json({ ok: true });
}
