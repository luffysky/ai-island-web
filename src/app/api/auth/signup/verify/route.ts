import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** POST { email, code, password, username } → 驗證碼正確就建帳號(email_confirm)。回 { ok }，client 端再 signInWithPassword。 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`signup-verify-ip:${ip}`, 20, 60_000).ok) {
    return NextResponse.json({ error: "rate_limited", message: "太頻繁，請稍後再試" }, { status: 429 });
  }
  const b = await req.json().catch(() => ({} as any));
  const email = String(b.email ?? "").trim().toLowerCase();
  const code = String(b.code ?? "").trim();
  const password = String(b.password ?? "");
  const username = String(b.username ?? "").trim();
  if (!email || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "bad_input", message: "請輸入 6 位數驗證碼" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "bad_password", message: "密碼至少 8 字" }, { status: 400 });
  if (username.length < 3) return NextResponse.json({ error: "bad_username", message: "使用者名稱至少 3 字" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: row } = await admin.from("email_verifications").select("code_hash, expires_at, attempts").eq("email", email).maybeSingle();
  if (!row) return NextResponse.json({ error: "no_code", message: "請先取得驗證碼" }, { status: 400 });
  if (new Date((row as any).expires_at).getTime() < Date.now()) {
    await admin.from("email_verifications").delete().eq("email", email);
    return NextResponse.json({ error: "expired", message: "驗證碼已過期，請重新取得" }, { status: 400 });
  }
  if ((row as any).attempts >= 5) {
    await admin.from("email_verifications").delete().eq("email", email);
    return NextResponse.json({ error: "too_many", message: "錯誤次數過多，請重新取得驗證碼" }, { status: 429 });
  }
  if ((row as any).code_hash !== sha256(code)) {
    await admin.from("email_verifications").update({ attempts: (row as any).attempts + 1 }).eq("email", email);
    return NextResponse.json({ error: "wrong_code", message: "驗證碼不正確" }, { status: 400 });
  }

  // 驗證通過 → 建帳號（email_confirm:true，因為我們已用驗證碼確認信箱）
  const { error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { username, agreed_terms_at: new Date().toISOString() },
  });
  if (createErr) {
    const msg = /already|registered|exists/i.test(createErr.message) ? "這個 Email 已經註冊過了" : createErr.message;
    return NextResponse.json({ error: "create_failed", message: msg }, { status: 400 });
  }
  await admin.from("email_verifications").delete().eq("email", email);
  return NextResponse.json({ ok: true });
}
