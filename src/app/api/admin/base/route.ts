import { NextResponse } from "next/server";

import { createSupabaseServer } from "@/lib/supabase-server";
import { isAdminStaff } from "@/lib/admin-roles";
import { checkOwner } from "@/lib/is-owner";
import { ADMIN_BASE } from "@/lib/admin-href";

export const dynamic = "force-dynamic";

/**
 * 後台路徑供給端點。
 *
 * 為什麼需要這支：ADMIN_SLUG 是防掃描用的密路徑，因此不能出現在
 * 瀏覽器 bundle 裡。但 TopNav / CommandPalette 這類 client 元件需要它
 * 才能渲染後台入口。解法是「不要在建置期給，改在執行期只給有權限的人」。
 *
 * 非後台人員一律 404，不是 403——403 等於承認「這裡有個你進不去的東西」，
 * 那本身就洩漏了後台的存在。
 */
export async function GET() {
  const notFound = NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const supabase = await createSupabaseServer();

    // getUser 會向 Supabase 驗證 token；getSession 只讀 cookie，可被偽造
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return notFound;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, username, is_owner")
      .eq("id", user.id)
      .single();

    if (!profile) return notFound;

    const { isOwner } = checkOwner({
      id: user.id,
      username: profile.username ?? null,
      role: profile.role ?? null,
      isOwner: (profile as { is_owner?: boolean | null }).is_owner ?? null,
      email: user.email ?? null,
    });

    if (!isAdminStaff(profile.role ?? null, isOwner)) return notFound;

    return NextResponse.json(
      { base: ADMIN_BASE },
      // 絕不快取：這個回應是針對單一使用者的，被 CDN 或瀏覽器共用快取
      // 就等於把密路徑發給別人
      { headers: { "Cache-Control": "no-store, private" } },
    );
  } catch {
    return notFound;
  }
}
