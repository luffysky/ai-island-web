import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { generateBindCode } from "@/lib/notify-user-line";

export const dynamic = "force-dynamic";

/** POST /api/me/line/bind-code — 產 6 位綁定 code 給目前 user */
export async function POST() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const code = await generateBindCode(user.id);
  return NextResponse.json({ ok: true, code, expiresInSec: 300 });
}
