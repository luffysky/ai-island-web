import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminLineUsers } from "@/lib/admin-line-users";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Rich Menu 一鍵 setup（admin only）
 *
 * 用法：admin 在後台或自己呼叫 GET /api/admin/line/setup-richmenu
 *  - 先 POST /v2/bot/richmenu 建 menu（6 格定義）
 *  - 上傳圖（從 RICH_MENU_IMAGE_URL env、或 fallback 用 placeholder）
 *  - 對每個 admin 套用（POST /user/{userId}/richmenu/{menuId}）
 *
 * 圖規格：2500×1686（或 800×540 也可）、PNG / JPEG。
 * 林董要自製圖、可上傳到任何 CDN（imgur / supabase storage）、
 * 把 URL 填到 env RICH_MENU_IMAGE_URL 即可。
 */

const RICH_MENU_DEF = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: "AI 島 Admin Menu",
  chatBarText: "選單",
  areas: [
    // 上排 3 格
    { bounds: { x: 0,     y: 0,    width: 833, height: 843 }, action: { type: "message", label: "今日 KPI", text: "/today" } },
    { bounds: { x: 833,   y: 0,    width: 833, height: 843 }, action: { type: "message", label: "近 7 天", text: "/kpi 7" } },
    { bounds: { x: 1666,  y: 0,    width: 834, height: 843 }, action: { type: "message", label: "用戶列表", text: "/users" } },
    // 下排 3 格
    { bounds: { x: 0,     y: 843,  width: 833, height: 843 }, action: { type: "message", label: "流失預警", text: "/churn" } },
    { bounds: { x: 833,   y: 843,  width: 833, height: 843 }, action: { type: "message", label: "系統錯誤", text: "/errors" } },
    { bounds: { x: 1666,  y: 843,  width: 834, height: 843 }, action: { type: "message", label: "幫助 / 偏好", text: "/help" } },
  ],
};

export async function GET(req: NextRequest) {
  // admin only（或 CRON_SECRET）
  let authorized = false;
  const cronSecret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET) authorized = true;
  if (!authorized) {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const admin = createSupabaseAdmin();
      const { data: prof } = await admin.from("profiles").select("role").eq("id", user.id).single();
      if ((prof as any)?.role === "admin") authorized = true;
    }
  }
  if (!authorized) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const channelToken = process.env.ADMIN_LINE_CHANNEL_TOKEN;
  if (!channelToken) return NextResponse.json({ error: "no_line_token" }, { status: 500 });

  const imageUrl = process.env.RICH_MENU_IMAGE_URL;
  if (!imageUrl) {
    return NextResponse.json({
      error: "no_image_url",
      hint: "請設定 RICH_MENU_IMAGE_URL env、值是 PNG / JPEG 圖檔 URL（2500×1686 建議）。" +
            " 可用 imgur / supabase storage / 任何 CDN。" +
            " 6 格設計順序：[今日 KPI][近 7 天][用戶列表] / [流失預警][系統錯誤][幫助]",
    }, { status: 400 });
  }

  try {
    // 1. 建 Rich Menu
    const createRes = await fetch("https://api.line.me/v2/bot/richmenu", {
      method: "POST",
      headers: { Authorization: `Bearer ${channelToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(RICH_MENU_DEF),
    });
    if (!createRes.ok) {
      const err = await createRes.text();
      return NextResponse.json({ error: "create_failed", detail: err.slice(0, 500) }, { status: 502 });
    }
    const { richMenuId } = await createRes.json() as { richMenuId: string };

    // 2. 上傳圖
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
    if (!imgRes.ok) {
      return NextResponse.json({ error: "image_fetch_failed", status: imgRes.status }, { status: 502 });
    }
    const imgBuf = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get("content-type") ?? "image/png";
    const uploadRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
      method: "POST",
      headers: { Authorization: `Bearer ${channelToken}`, "Content-Type": contentType },
      body: imgBuf,
    });
    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return NextResponse.json({ error: "upload_failed", detail: err.slice(0, 500), richMenuId }, { status: 502 });
    }

    // 3. 對每個 admin 套用
    const adminUsers = getAdminLineUsers().filter((u) => u.id);
    const applied: string[] = [];
    for (const u of adminUsers) {
      const r = await fetch(`https://api.line.me/v2/bot/user/${u.id}/richmenu/${richMenuId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${channelToken}` },
      });
      if (r.ok) applied.push(u.name);
    }

    // 4. 順便設為「預設」menu（新加好友自動套用）
    try {
      await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${channelToken}` },
      });
    } catch {}

    return NextResponse.json({ ok: true, richMenuId, applied });
  } catch (e: any) {
    return NextResponse.json({ error: "setup_failed", message: e?.message }, { status: 500 });
  }
}

/**
 * DELETE — 移除目前 Rich Menu（清掉並 unlink 所有 admin）
 */
export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data: prof } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if ((prof as any)?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const channelToken = process.env.ADMIN_LINE_CHANNEL_TOKEN;
  if (!channelToken) return NextResponse.json({ error: "no_line_token" }, { status: 500 });

  // 列出所有 richmenus、全部刪
  try {
    const listRes = await fetch("https://api.line.me/v2/bot/richmenu/list", {
      headers: { Authorization: `Bearer ${channelToken}` },
    });
    const { richmenus } = await listRes.json() as { richmenus: Array<{ richMenuId: string }> };
    for (const m of richmenus ?? []) {
      await fetch(`https://api.line.me/v2/bot/richmenu/${m.richMenuId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${channelToken}` },
      });
    }
    return NextResponse.json({ ok: true, deleted: richmenus.length });
  } catch (e: any) {
    return NextResponse.json({ error: "delete_failed", message: e?.message }, { status: 500 });
  }
}
