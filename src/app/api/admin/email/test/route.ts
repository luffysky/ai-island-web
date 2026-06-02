import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { sendEmailRaw } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => ({} as any));
  const to = String(body.to ?? "").trim();
  const subject = String(body.subject ?? "AI 島 — 測試").trim();
  const text = String(body.text ?? "Test").trim();
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const html = `<div style="font-family: -apple-system, sans-serif; line-height: 1.6; max-width: 560px; margin: 0 auto; padding: 24px;">
    <h2 style="color: #50fa7b;">🏝️ AI 島 — 測試信</h2>
    <pre style="white-space: pre-wrap; background: #f4f4f4; padding: 16px; border-radius: 8px;">${text.replace(/</g, "&lt;")}</pre>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
    <p style="font-size: 12px; color: #888;">由 ${gate.username} 從後台 /admin/email/test 發送。</p>
  </div>`;

  const result = await sendEmailRaw({ to, subject, html, text });

  const admin = createSupabaseAdmin();
  await admin.from("audit_logs").insert({
    actor_id: gate.userId,
    actor_username: gate.username,
    action: "admin.email_test_send",
    target_type: "email",
    target_id: to,
    changes: { subject, ok: result.ok, error: result.ok ? null : result.error, resend_id: result.ok ? result.id : null },
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
