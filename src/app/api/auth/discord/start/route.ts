import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getDiscordOAuthURL } from "@/lib/discord-binding";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth/login?redirect=/me/settings", process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet"));
  }

  // 把 user.id 加密成 state（防止 CSRF + 不暴露 id）
  const stateToken = `${user.id}.${randomBytes(16).toString("hex")}`;
  const res = NextResponse.redirect(getDiscordOAuthURL(stateToken));
  res.cookies.set("dc_oauth_state", stateToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
