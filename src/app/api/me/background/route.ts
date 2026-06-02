import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isValidBackground } from "@/lib/user-background";

export const dynamic = "force-dynamic";

// 設定 / 清除學員個人背景（preset key 或上傳圖片 URL；空字串 = 清除）
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const bg = String(body.background ?? "").trim().slice(0, 500);
  if (!isValidBackground(bg)) return NextResponse.json({ error: "invalid_background" }, { status: 400 });

  const { error } = await supabase
    .from("profiles")
    .update({ background: bg || null })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, background: bg || null });
}
