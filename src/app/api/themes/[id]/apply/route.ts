import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// POST /api/themes/[id]/apply — 一鍵套用：把 profiles.active_theme_id 指過去。
// row 早已存在（Studio 先 POST 建立），這裡只翻指標。
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  // 確認主題存在且屬於本人（RLS 會把非本人的濾掉）；一併取 definition 寫進 cookie 供 SSR。
  const { data: theme, error: themeErr } = await supabase
    .from("themes")
    .select("id, definition")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (themeErr || !theme) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // 讀舊的 active_theme_id 再更新（回傳 previousThemeId 供還原）。
  const { data: prof } = await supabase
    .from("profiles")
    .select("active_theme_id")
    .eq("id", user.id)
    .single();
  const previousThemeId = prof?.active_theme_id ?? null;

  const { error: updErr } = await supabase
    .from("profiles")
    .update({ active_theme_id: id })
    .eq("id", user.id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // 寫 ai_theme cookie（整包 definition）→ 下次載入 layout 於首屏 inline 套用、無 FOUC。
  const res = NextResponse.json({ themeId: id, previousThemeId });
  try {
    res.cookies.set("ai_theme", encodeURIComponent(JSON.stringify(theme.definition)), {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
  } catch {
    // definition 太大或序列化失敗 → 不寫 cookie（仍會即時套用、只是重整後回預設）
  }
  return res;
}
