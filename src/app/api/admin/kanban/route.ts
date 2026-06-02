import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function gateAdmin() {
  const g = await requireAdmin();
  if (!g.ok) return { ok: false as const, status: g.status, body: { error: g.status === 401 ? "unauthorized" : "forbidden" } };
  return { ok: true as const, userId: g.userId };
}

/** GET — 拿全部 boards + columns + cards（一次撈乾淨、前端 group 用） */
export async function GET() {
  const gate = await gateAdmin();
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const admin = createSupabaseAdmin();
  const [boardsRes, colsRes, cardsRes] = await Promise.all([
    admin.from("admin_kanban_boards").select("*").order("position", { ascending: true }),
    admin.from("admin_kanban_columns").select("*").order("position", { ascending: true }),
    admin.from("admin_kanban_cards").select("*").order("position", { ascending: true }),
  ]);

  return NextResponse.json({
    boards: boardsRes.data ?? [],
    columns: colsRes.data ?? [],
    cards: cardsRes.data ?? [],
  });
}

/** POST — 新增 card */
export async function POST(req: NextRequest) {
  const gate = await gateAdmin();
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await req.json().catch(() => ({} as any));
  const column_id = String(body.column_id ?? "");
  const title = String(body.title ?? "").trim();
  if (!column_id || !title) return NextResponse.json({ error: "missing_required" }, { status: 400 });

  const admin = createSupabaseAdmin();
  // 算 position：放最後
  const { count } = await admin.from("admin_kanban_cards")
    .select("id", { count: "exact", head: true }).eq("column_id", column_id);

  const { data, error } = await admin.from("admin_kanban_cards").insert({
    column_id,
    title: title.slice(0, 200),
    description: body.description ? String(body.description).slice(0, 4000) : null,
    category: body.category ? String(body.category).slice(0, 50) : null,
    labels: Array.isArray(body.labels) ? body.labels.slice(0, 20).map((l: any) => String(l).slice(0, 50)) : [],
    position: count ?? 0,
    meta: body.meta ?? {},
  }).select("*").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, card: data });
}
