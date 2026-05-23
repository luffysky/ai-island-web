import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/me/notifications?count_only=1 → { unread: N }
 * GET /api/me/notifications → { items: [...], unread: N }
 */
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [], unread: 0 });

  const countOnly = req.nextUrl.searchParams.get("count_only") === "1";

  if (countOnly) {
    // notifications 表可能不存在 → catch fallback 0
    try {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);
      return NextResponse.json({ unread: count ?? 0 });
    } catch {
      return NextResponse.json({ unread: 0 });
    }
  }

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, kind, title, body, link, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    const unread = (data ?? []).filter((n: any) => !n.read_at).length;
    return NextResponse.json({ items: data ?? [], unread });
  } catch {
    return NextResponse.json({ items: [], unread: 0 });
  }
}
