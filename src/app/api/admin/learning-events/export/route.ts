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
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  const eventType = sp.get("event_type") ?? "all";
  const chapterId = sp.get("chapter_id") ?? "all";
  const userId = sp.get("user_id");

  if (!from || !to) {
    return NextResponse.json({ error: "date_range_required" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  let q = admin
    .from("learning_events")
    .select("*", { count: "exact" })
    .gte("created_at", from)
    .lte("created_at", to);
  if (eventType !== "all") q = q.eq("event_type", eventType);
  if (chapterId !== "all") q = q.eq("chapter_id", Number(chapterId));
  if (userId) q = q.eq("user_id", userId);

  const { count } = await q;
  if ((count ?? 0) > MAX_ROWS) {
    return NextResponse.json({
      error: "too_many_rows",
      count,
      limit: MAX_ROWS,
      message: `匹配 ${count} 筆、超過 ${MAX_ROWS} 上限`,
    }, { status: 413 });
  }

  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: user.id,
    actor_username: me.username,
    action: "learning_events.exported",
    target_type: "learning_events",
    changes: { filter: { from, to, eventType, chapterId, userId }, rows: data?.length ?? 0 },
    ip: req.headers.get("x-forwarded-for") || null,
  });

  const csv = UTF8_BOM + toCsv(data ?? [], [
    { key: "id", header: "id" },
    { key: "created_at", header: "created_at" },
    { key: "user_id", header: "user_id" },
    { key: "event_type", header: "event_type" },
    { key: "chapter_id", header: "chapter_id" },
    { key: "lesson_id", header: "lesson_id" },
    { key: "metadata", header: "metadata_json" },
  ]);

  const ts = new Date().toISOString().replace(/[:.]/g, "").slice(0, 13);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="learning-events-${ts}.csv"`,
    },
  });
}
