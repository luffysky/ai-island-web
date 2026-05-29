import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { exchangeCode, fetchDiscordUser, joinGuild, recordBinding } from "@/lib/discord-binding";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateFromUrl = url.searchParams.get("state");

  if (!code || !stateFromUrl) {
    return NextResponse.redirect(`${site}/me/settings?dc=error_missing_params`);
  }

  // verify CSRF state
  const stateCookie = req.cookies.get("dc_oauth_state")?.value;
  if (!stateCookie || stateCookie !== stateFromUrl) {
    return NextResponse.redirect(`${site}/me/settings?dc=error_state_mismatch`);
  }

  // user 必須登入
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${site}/auth/login?redirect=/me/settings`);
  }

  // state 第一段是 user.id、確認一致
  const [stateUserId] = stateFromUrl.split(".");
  if (stateUserId !== user.id) {
    return NextResponse.redirect(`${site}/me/settings?dc=error_user_mismatch`);
  }

  const tokens = await exchangeCode(code);
  if (!tokens) {
    return NextResponse.redirect(`${site}/me/settings?dc=error_exchange_failed`);
  }

  const dcUser = await fetchDiscordUser(tokens.access_token);
  if (!dcUser) {
    return NextResponse.redirect(`${site}/me/settings?dc=error_user_info`);
  }

  // 主動 join guild
  await joinGuild(dcUser.id, tokens.access_token).catch(() => false);

  // 寫入 bind + 觸發 DM / role
  await recordBinding(user.id, dcUser, tokens.refresh_token);

  const res = NextResponse.redirect(`${site}/me/settings?dc=ok`);
  res.cookies.delete("dc_oauth_state");
  return res;
}
