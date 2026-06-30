import { NextRequest, NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { sendEmailRaw } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** POST { email } → 寄 6 位數驗證碼。回 { ok }（不洩漏帳號是否存在）。 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`signup-code-ip:${ip}`, 10, 60_000).ok) {
    return NextResponse.json({ error: "rate_limited", message: "太頻繁，請稍後再試" }, { status: 429 });
  }
  const b = await req.json().catch(() => ({} as any));
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "bad_email", message: "Email 格式不正確" }, { status: 400 });
  }
  // 每信箱 5 分鐘最多 3 封
  if (!rateLimit(`signup-code-email:${email}`, 3, 5 * 60_000).ok) {
    return NextResponse.json({ error: "rate_limited", message: "驗證碼已寄出，請稍後再試或檢查信箱" }, { status: 429 });
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("email_verifications").upsert({
    email, code_hash: sha256(code), purpose: "signup",
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(), attempts: 0, created_at: new Date().toISOString(),
  }, { onConflict: "email" });
  if (error) return NextResponse.json({ error: "db", message: error.message }, { status: 500 });

  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
    <h2>🏝️ AI 島 註冊驗證碼</h2>
    <p>你的驗證碼是：</p>
    <div style="font-size:32px;font-weight:800;letter-spacing:8px;background:#f4f4f5;border-radius:12px;padding:16px;text-align:center;color:#111">${code}</div>
    <p style="color:#888;font-size:13px;margin-top:16px">10 分鐘內有效。如果不是你本人操作，請忽略這封信。</p>
  </div>`;
  const r = await sendEmailRaw({ to: email, subject: `【AI 島】註冊驗證碼 ${code}`, html, text: `你的 AI 島 註冊驗證碼：${code}（10 分鐘內有效）` });
  if (!r.ok) return NextResponse.json({ error: "send_failed", message: "驗證碼寄送失敗，請稍後再試" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
