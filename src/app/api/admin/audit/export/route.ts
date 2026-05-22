import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { toCsv, UTF8_BOM } from "@/lib/csv";

const MAX_ROWS = 50_000;

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  const action = sp.get("action") ?? "all";
  const actor = sp.get("actor") ?? "";
  const targetType = sp.get("target_type") ?? "all";

  if (!from || !to) {
    return NextResponse.json({ error: "date_range_required" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  let q = admin
    .from("audit_logs")
    .select("*", { count: "exact" })
    .gte("created_at", from)
    .lte("created_at", to);
  if (action !== "all") q = q.eq("action", action);
  if (actor) q = q.ilike("actor_username", `%${actor.replace(/[%,*()\\]/g, "")}%`);
  if (targetType !== "all") q = q.eq("target_type", targetType);

  const { count } = await q;
  if ((count ?? 0) > MAX_ROWS) {
    return NextResponse.json({
      error: "too_many_rows",
      count,
      limit: MAX_ROWS,
      message: `匹配 ${count} 筆、超過 ${MAX_ROWS} 上限、請縮小日期範圍`,
    }, { status: 413 });
  }

  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Write audit-of-audit
  await admin.from("audit_logs").insert({
    actor_id: user.id,
    actor_username: me.username,
    action: "admin.audit_exported",
    target_type: "audit_logs",
    target_id: null,
    changes: { filter: { from, to, action, actor, targetType }, rows: data?.length ?? 0 },
    ip: req.headers.get("x-forwarded-for") || null,
    user_agent: req.headers.get("user-agent") || null,
  });

  const csv = UTF8_BOM + toCsv(data ?? [], [
    { key: "id", header: "id" },
    { key: "created_at", header: "created_at" },
    { key: "actor_username", header: "actor" },
    { key: "actor_id", header: "actor_id" },
    { key: "action", header: "action" },
    { key: "target_type", header: "target_type" },
    { key: "target_id", header: "target_id" },
    { key: "changes", header: "changes_json" },
    { key: "ip", header: "ip" },
    { key: "user_agent", header: "user_agent" },
  ]);

  const ts = new Date().toISOString().replace(/[:.]/g, "").slice(0, 13);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log-${ts}.csv"`,
    },
  });
}
