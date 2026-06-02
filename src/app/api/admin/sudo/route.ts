import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-guard";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  // 簽 HMAC cookie，1 小時有效
  const payload = {
    uid: gate.userId,
    exp: Date.now() + 60 * 60 * 1000,
    jti: crypto.randomUUID(),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", process.env.AI_KEY_SECRET || "dev-secret")
    .update(payloadB64)
    .digest("base64url");
  const cookieValue = `${payloadB64}.${sig}`;

  // Audit log
  const admin = createSupabaseAdmin();
  await admin.from("audit_logs").insert({
    actor_id: gate.userId,
    actor_username: gate.username,
    action: "admin.sudo_granted",
    target_type: "session",
    target_id: payload.jti,
    ip: req.headers.get("x-forwarded-for") || null,
    user_agent: req.headers.get("user-agent") || null,
  });

  const res = NextResponse.json({ ok: true, expiresAt: payload.exp });
  res.cookies.set("admin_sudo", cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60, // 1 hr
    path: "/",
  });
  return res;
}

// DELETE 撤銷 sudo
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin_sudo");
  return res;
}
