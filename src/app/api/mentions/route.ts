import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 部落格編輯器 @ 提及搜尋：GET /api/mentions?q=<字>
 * 回 { users: [{ id, label, avatar }] }（最多 8 筆）。只回公開欄位（id/顯示名/頭像）。
 * 需登入才給查（避免匿名列舉使用者）；未登入或無字 → 回空陣列（前端 graceful）。
 */
export async function GET(req: NextRequest) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  const empty = NextResponse.json({ users: [] });

  // 需登入
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return empty;
  if (q.length < 1) return empty;

  const admin = createSupabaseAdmin();
  const like = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`; // escape LIKE 萬用字元
  const { data, error } = await admin
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .or(`username.ilike.${like},display_name.ilike.${like}`)
    .is("banned_at", null)
    .is("deleted_at", null)
    .limit(8);
  if (error) return empty;

  const users = ((data as any[]) ?? [])
    .map((p) => ({ id: String(p.id), label: String(p.display_name || p.username || "").trim(), avatar: p.avatar_url ?? null }))
    .filter((u) => u.id && u.label);
  return NextResponse.json({ users });
}
