import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

/**
 * 標記 campaign 為「sent」、寫入 recipients（依 segment）。
 * 實際 SMTP 寄送由背景 worker 處理（本任務不接 Resend、留 spec）。
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const supabase = await createSupabaseServer();

  const { id } = await params;
  const admin = createSupabaseAdmin();

  const { data: camp } = await admin.from("email_campaigns").select("*").eq("id", id).maybeSingle();
  if (!camp) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (camp.status === "sent") return NextResponse.json({ error: "already_sent" }, { status: 400 });

  // 取目標 user
  let targets: { id: string; email: string }[] = [];
  if (camp.segment_id) {
    // 簡單版：segment.filter_json 內含 { xp_gte, role, ... }
    const { data: seg } = await admin.from("user_segments").select("filter_json").eq("id", camp.segment_id).maybeSingle();
    const f = (seg?.filter_json ?? {}) as any;
    let q = admin.from("profiles").select("id, email") as any;
    if (typeof f.xp_gte === "number") q = q.gte("xp", f.xp_gte);
    if (typeof f.level_gte === "number") q = q.gte("level", f.level_gte);
    if (typeof f.role === "string") q = q.eq("role", f.role);
    const { data: rows } = await q.is("banned_at", null).limit(50000);
    targets = (rows ?? []).filter((r: any) => r.email) as any;
  } else {
    // 沒選 segment → 全部 active 使用者
    const { data: rows } = await admin.from("profiles").select("id, email").is("banned_at", null).limit(50000);
    targets = (rows ?? []).filter((r: any) => r.email) as any;
  }

  // 寫 recipients
  if (targets.length > 0) {
    const inserts = targets.map((t) => ({
      campaign_id: id,
      user_id: t.id,
      email: t.email,
    }));
    // 批次 insert（500 一批）
    for (let i = 0; i < inserts.length; i += 500) {
      await admin.from("email_recipients").insert(inserts.slice(i, i + 500));
    }
  }

  await admin.from("email_campaigns").update({
    status: "sent",
    sent_at: new Date().toISOString(),
    recipient_count: targets.length,
  }).eq("id", id);

  await supabase.from("admin_events").insert({
    event_type: "email_campaign_sent",
    user_id: gate.userId,
    meta: { campaign_id: id, recipient_count: targets.length },
  });

  return NextResponse.json({ ok: true, recipient_count: targets.length });
}
