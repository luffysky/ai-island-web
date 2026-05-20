import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

// LINE OAuth callback handler
// 設定步驟：
// 1. LINE Developer Console 建 Login Channel
// 2. Callback URL: https://your-domain.com/auth/line/callback
// 3. 環境變數：
//    - NEXT_PUBLIC_LINE_CHANNEL_ID（前端用、login button）
//    - LINE_CHANNEL_SECRET（後端用、這裡）
//    - SUPABASE_SERVICE_ROLE_KEY（已有、用來建立 user）
//    - NEXT_PUBLIC_SITE_URL（production domain、必設）

function getOrigin(req: NextRequest): string {
  // 1. NEXT_PUBLIC_SITE_URL 優先（production 必設、排除 localhost）
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env && !env.includes("localhost")) {
    return env;
  }

  // 2. forwarded headers（反向代理）
  const fwdHost = req.headers.get("x-forwarded-host");
  const fwdProto = req.headers.get("x-forwarded-proto") || "https";
  if (fwdHost && !fwdHost.includes("localhost")) {
    return `${fwdProto}://${fwdHost}`;
  }

  // 3. host header
  const host = req.headers.get("host");
  if (host && !host.includes("localhost")) {
    return `https://${host}`;
  }

  // 4. fallback：req.url（最不可信）
  return new URL(req.url).origin;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const origin = getOrigin(req);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=line_${error}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelId || !channelSecret) {
    return NextResponse.redirect(`${origin}/login?error=line_not_configured`);
  }

  try {
    // Step 1: 用 code 換 token
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${origin}/auth/line/callback`,
        client_id: channelId,
        client_secret: channelSecret,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("LINE token error:", err);
      return NextResponse.redirect(`${origin}/login?error=line_token`);
    }

    const tokenData = await tokenRes.json();
    const { access_token, id_token } = tokenData;

    // Step 2: 取 LINE user profile
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
      return NextResponse.redirect(`${origin}/login?error=line_profile`);
    }

    const lineProfile = await profileRes.json();
    // lineProfile: { userId, displayName, pictureUrl }

    // 從 id_token 解 email（如果 user 有提供）
    let email: string | undefined;
    if (id_token) {
      try {
        const payload = JSON.parse(
          Buffer.from(id_token.split(".")[1], "base64").toString()
        );
        email = payload.email;
      } catch {
        // 沒 email 也 OK、用 LINE userId 當 unique
      }
    }

    // Step 3: 用 Supabase Admin API 建立 / 取得 user
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // 用 LINE userId 當 unique identifier
    const lineEmail = email || `line_${lineProfile.userId}@line.local`;

    // 嘗試取得既有 user
    const adminRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(lineEmail)}`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );

    let userId: string;
    const adminData = await adminRes.json();

    if (adminData.users && adminData.users.length > 0) {
      // 既有 user
      userId = adminData.users[0].id;
    } else {
      // 建立新 user
      const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: lineEmail,
          email_confirm: true,
          user_metadata: {
            line_user_id: lineProfile.userId,
            display_name: lineProfile.displayName,
            avatar_url: lineProfile.pictureUrl,
            provider: "line",
          },
        }),
      });

      const newUser = await createRes.json();
      userId = newUser.id;

      // 建立 profile
      const supabase = await createSupabaseServer();
      await supabase.from("profiles").insert({
        id: userId,
        username: `line_${lineProfile.userId.slice(-8)}`,
        display_name: lineProfile.displayName,
        avatar_url: lineProfile.pictureUrl,
        xp: 0,
        z_coin: 100,
        hearts: 5,
      });
    }

    // Step 4: 產 Supabase session
    const sessionRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/generate_link`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "magiclink",
          email: lineEmail,
        }),
      }
    );

    const sessionData = await sessionRes.json();
    const actionLink = sessionData.action_link || sessionData.properties?.action_link;

    if (actionLink) {
      // Redirect 去 magic link、會自動 sign-in
      return NextResponse.redirect(actionLink);
    }

    return NextResponse.redirect(`${origin}/login?error=session_failed`);
  } catch (err: any) {
    console.error("LINE login error:", err);
    return NextResponse.redirect(`${origin}/login?error=line_exception`);
  }
}
