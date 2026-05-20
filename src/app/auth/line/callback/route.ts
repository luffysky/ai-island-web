import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

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
  // LINE token exchange 的 redirect_uri 必須和前端送去 LINE 的 window.location.origin 完全一致。
  // 所以這裡優先信任實際 request host，再 fallback 到 env。
  const fwdHost = req.headers.get("x-forwarded-host");
  const fwdProto = req.headers.get("x-forwarded-proto") || "https";
  if (fwdHost && !fwdHost.includes("localhost")) {
    return `${fwdProto}://${fwdHost}`;
  }

  const host = req.headers.get("host");
  if (host && !host.includes("localhost")) {
    return `https://${host}`;
  }

  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env && !env.includes("localhost")) {
    return env;
  }

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

    let userId: string;
    const admin = createSupabaseAdmin();
    const { data: usersData, error: listError } = await admin.auth.admin.listUsers();

    if (listError) {
      console.error("LINE list users error:", listError);
      return NextResponse.redirect(`${origin}/login?error=line_admin`);
    }

    const existingUser = usersData.users.find((u) => u.email === lineEmail);

    if (existingUser) {
      // 既有 user
      userId = existingUser.id;

      const { data: existingProfile } = await admin
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (!existingProfile) {
        await admin.from("profiles").insert({
          id: userId,
          username: `line_${lineProfile.userId.slice(-8)}`.slice(0, 30),
          display_name: lineProfile.displayName,
          avatar_url: lineProfile.pictureUrl,
          xp: 0,
          z_coin: 100,
          hearts: 5,
        });
      }
    } else {
      // 建立新 user
      const { data: createData, error: createError } = await admin.auth.admin.createUser({
        email: lineEmail,
        email_confirm: true,
        user_metadata: {
          line_user_id: lineProfile.userId,
          display_name: lineProfile.displayName,
          avatar_url: lineProfile.pictureUrl,
          provider: "line",
        },
      });

      if (createError || !createData.user) {
        console.error("LINE create user error:", createError);
        return NextResponse.redirect(`${origin}/login?error=line_create_user`);
      }

      userId = createData.user.id;

      // 建立 profile
      await admin.from("profiles").insert({
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
          redirect_to: `${origin}/auth/callback`,
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
