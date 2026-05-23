import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * 取消軟刪（7 天內可救回）。
 * 注意：軟刪的 user 仍能登入（軟刪只擋寫入、UI 顯示警告）。
 */
export async function POST() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase.rpc("gdpr_cancel_delete_self");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, message: "已取消刪除請求、帳號恢復" });
}
