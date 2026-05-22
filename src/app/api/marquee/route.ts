import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 公開 endpoint：拿目前 active 的站內公告（marquee 用）。
 * 條件：channel = in_app + status = sent + (scheduled_at IS NULL OR <= now)。
 */
export async function GET() {
  try {
    const admin = createSupabaseAdmin();
    const now = new Date().toISOString();
    const { data } = await admin
      .from("broadcasts")
      .select("id, title, content, created_at")
      .eq("channel", "in_app")
      .eq("status", "sent")
      .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
      .order("sent_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(10);
    return NextResponse.json({ broadcasts: data ?? [] });
  } catch (e) {
    return NextResponse.json({ broadcasts: [] });
  }
}
