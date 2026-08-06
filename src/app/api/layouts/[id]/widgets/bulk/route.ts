import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getWidgetDefinition } from "@/lib/widgets/registry";
import { GRID, validateItem, type GridItem } from "@/lib/widgets/grid";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * PATCH /api/layouts/[id]/widgets/bulk — 批次存位置。
 * server 重新驗證尺寸/範圍（照 Space：不靜默修正、非法整批拒絕）。
 * body: { items: [{ id, widget_type, position }] }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: layoutId } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return NextResponse.json({ error: "no_items" }, { status: 400 });

  // desktop 尺寸/範圍驗證（tablet/mobile 由前端推導、這裡驗 desktop 為主）
  const gridItems: GridItem[] = [];
  for (const it of items) {
    const d = it?.position?.desktop;
    const def = getWidgetDefinition(String(it?.widget_type ?? ""));
    if (!d || !def) return NextResponse.json({ error: "bad_item", id: it?.id }, { status: 400 });
    const gi: GridItem = { id: String(it.id), x: d.x, y: d.y, w: d.w, h: d.h };
    const v = validateItem(gi, { minW: def.minSize.w, minH: def.minSize.h, maxW: def.maxSize.w, maxH: def.maxSize.h }, GRID.desktop.columns);
    if (!v.ok) return NextResponse.json({ error: "invalid", id: it.id, reason: v.reason }, { status: 422 });
    gridItems.push(gi);
  }

  // 逐筆更新（RLS 確保只能動自己的；layout 也綁 user）
  const results = await Promise.all(
    items.map((it: any) =>
      supabase
        .from("widget_instances")
        .update({ position: it.position, updated_at: new Date().toISOString() })
        .eq("id", it.id)
        .eq("layout_id", layoutId)
        .eq("user_id", user.id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: items.length });
}
