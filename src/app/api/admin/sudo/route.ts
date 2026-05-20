import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role, username").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // 簽 HMAC cookie，1 小時有效
  const payload = {
    uid: user.id,
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
    actor_id: user.id,
    actor_username: profile.username,
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
