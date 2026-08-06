import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getWidgetDefinition, isWidgetId } from "@/lib/widgets/registry";
import { GRID, layoutHeight, deriveTabletFromDesktop, deriveMobileFromDesktop, type GridItem } from "@/lib/widgets/grid";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/layouts/[id]/widgets — 加一個 widget instance（自動排到底、算三斷點）。 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: layoutId } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const type = String(body.widget_type ?? "");
  if (!isWidgetId(type)) return NextResponse.json({ error: "unknown_widget" }, { status: 400 });
  const def = getWidgetDefinition(type)!;

  // 確認 layout 屬於自己（RLS 也擋，但先明確查）
  const { data: layout } = await supabase.from("widget_layouts").select("id").eq("id", layoutId).eq("user_id", user.id).maybeSingle();
  if (!layout) return NextResponse.json({ error: "layout_not_found" }, { status: 404 });

  // 現有 desktop items → 排到最底
  const { data: existing } = await supabase.from("widget_instances").select("id, position").eq("layout_id", layoutId);
  const desktopItems: GridItem[] = (existing ?? []).map((r: any) => {
    const d = r.position?.desktop ?? { x: 0, y: 0, w: 2, h: 2 };
    return { id: r.id, x: d.x, y: d.y, w: d.w, h: d.h };
  });
  const y = layoutHeight(desktopItems);
  const w = Math.min(def.defaultSize.w, GRID.desktop.columns);
  const newDesktop = { x: 0, y, w, h: def.defaultSize.h };

  // 重算全部三斷點（含新的）
  const allDesktop = [...desktopItems, { id: "__new__", ...newDesktop }];
  const tablet = deriveTabletFromDesktop(allDesktop);
  const mobile = deriveMobileFromDesktop(allDesktop);
  const tNew = tablet.find((t) => t.id === "__new__")!;
  const mNew = mobile.find((m) => m.id === "__new__")!;

  const { data: inserted, error } = await supabase
    .from("widget_instances")
    .insert({
      user_id: user.id,
      layout_id: layoutId,
      widget_type: type,
      position: { desktop: newDesktop, tablet: { x: tNew.x, y: tNew.y, w: tNew.w, h: tNew.h }, mobile: { order: mNew.order } },
      config: def.defaultConfig ?? {},
    })
    .select("id, widget_type, position, config, hidden, locked, layout_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ widget: inserted });
}
