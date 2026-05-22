import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * POST /api/todo/reorder
 * Body: { items: [{ id, sort_order, parent_id? }] }
 * 拖曳完釋放時呼叫一次、批次更新 sort_order（+ optional parent_id 換父）。
 * Fire-and-forget pattern：前端不等回應、失敗才退回。
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { items?: Array<{ id: string; sort_order: number; parent_id?: string | null }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const items = body.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > 200) {
    return NextResponse.json({ error: "items_required_1_to_200" }, { status: 400 });
  }

  // 平行 update、走 RLS 限本 user 可改
  const results = await Promise.all(
    items.map((it) => {
      const patch: Record<string, any> = { sort_order: it.sort_order };
      if (it.parent_id !== undefined) patch.parent_id = it.parent_id;
      return supabase.from("todos").update(patch).eq("id", it.id);
    }),
  );

  const failed = results.filter((r) => r.error);
  if (failed.length > 0) {
    return NextResponse.json(
      { error: "partial_failure", failed: failed.length, total: items.length },
      { status: 207 },
    );
  }
  return NextResponse.json({ ok: true, updated: items.length });
}
