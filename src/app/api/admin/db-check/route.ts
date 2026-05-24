import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/db-check
 *
 * 核對所有預期的表 + 關鍵欄位是否存在。
 * 給林董一鍵確認「哪些 migration 沒跑」。
 */
const CHECKS: Array<{ table: string; cols?: string[]; migration: string }> = [
  // core
  { table: "profiles", cols: ["line_user_id", "line_notify_enabled", "line_bound_at"], migration: "user_line_bind_migration.sql" },
  { table: "tickets", cols: ["meta"], migration: "tickets_meta_migration.sql ⚠️ 新" },
  { table: "ticket_messages", cols: ["body", "is_staff", "meta"], migration: "tickets_meta_migration.sql ⚠️ 新" },
  { table: "canned_replies", migration: "canned_replies_migration.sql" },
  { table: "media_assets", migration: "media_assets_migration.sql" },
  { table: "content_embeddings", migration: "semantic_search_migration.sql" },
  { table: "broadcasts", migration: "admin_migration.sql" },
  { table: "audit_logs", migration: "admin_migration.sql" },
  { table: "notifications", migration: "notifications_migration.sql" },
  { table: "line_bind_codes", migration: "user_line_bind_migration.sql" },
  // commerce / 訂閱
  { table: "orders", migration: "commerce_migration.sql" },
  { table: "subscriptions", migration: "commerce_migration.sql" },
  // misc
  { table: "blog_posts", migration: "blog_migration.sql" },
  { table: "forum_threads", migration: "forum_migration.sql" },
  { table: "error_logs", migration: "error_log_migration.sql" },
  { table: "rate_limits", migration: "rate_limit_migration.sql" },
];

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createSupabaseAdmin();
  const results: any[] = [];

  for (const c of CHECKS) {
    const row: any = { table: c.table, migration: c.migration };
    try {
      // 試查 1 筆判斷表存在
      const { error } = await admin.from(c.table).select("*", { count: "exact", head: true });
      if (error) {
        row.exists = false;
        row.error = error.message;
      } else {
        row.exists = true;
        // 檢查欄位
        if (c.cols && c.cols.length > 0) {
          const sel = c.cols.join(",");
          const { error: colErr } = await admin.from(c.table).select(sel).limit(1);
          if (colErr) {
            row.cols_ok = false;
            row.col_error = colErr.message;
            row.missing_cols = c.cols;
          } else {
            row.cols_ok = true;
          }
        }
      }
    } catch (e: any) {
      row.exists = false;
      row.error = e?.message;
    }
    results.push(row);
  }

  const pending = results.filter((r) => !r.exists || r.cols_ok === false);
  return NextResponse.json({
    total: results.length,
    pending_count: pending.length,
    pending,
    all: results,
  });
}
