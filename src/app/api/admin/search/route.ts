import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * Cmd+K 指令面板的「即時資料查詢」端點。
 * 依關鍵字撈 profiles（username / email / display_name）＋ orders（order_no / product_name），
 * 回一份小小的合併清單給前端 render。純唯讀、guarded。
 */

type SearchHit = {
  type: "user" | "order";
  id: string;
  title: string;
  subtitle: string;
  href: string; // 內部路徑（/admin/...），前端會加 slug
};

// 防 PostgREST or() filter 注入：只留安全字元
function sanitize(q: string): string {
  return q.replace(/[%,()*\\'"]/g, " ").trim().slice(0, 60);
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const raw = req.nextUrl.searchParams.get("q") ?? "";
  const q = sanitize(raw);
  if (q.length < 1) return NextResponse.json({ results: [] });

  const admin = createSupabaseAdmin();
  const like = `%${q}%`;

  const [usersRes, ordersRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id, username, display_name, email, role")
      .or(`username.ilike.${like},email.ilike.${like},display_name.ilike.${like}`)
      .limit(6),
    admin
      .from("orders")
      .select("id, order_no, product_name, amount, status, created_at")
      .or(`order_no.ilike.${like},product_name.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const results: SearchHit[] = [];

  for (const u of (usersRes.data as any[]) ?? []) {
    results.push({
      type: "user",
      id: u.id,
      title: u.display_name || u.username || u.email || u.id,
      subtitle: [u.username ? `@${u.username}` : null, u.email, u.role].filter(Boolean).join(" · "),
      href: `/admin/users/${u.id}`,
    });
  }

  for (const o of (ordersRes.data as any[]) ?? []) {
    results.push({
      type: "order",
      id: o.id,
      title: o.order_no || o.id,
      subtitle: [o.product_name, o.status, o.amount != null ? `NT$ ${o.amount}` : null]
        .filter(Boolean)
        .join(" · "),
      href: `/admin/orders?q=${encodeURIComponent(o.order_no ?? "")}`,
    });
  }

  return NextResponse.json({ results });
}
