import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { defaultLayoutInstances } from "@/lib/widgets/presets";
import { WIDGET_REGISTRY, type WidgetId } from "@/lib/widgets/registry";
import { HomeGrid } from "./HomeGrid";
import type { WidgetInstance } from "@/lib/widgets/types";

// 個人可編輯 widget 首頁。需登入、即時讀 DB。
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 找 active layout；沒有就建預設（RLS：自己的 insert 合法）
  let { data: layout } = await supabase
    .from("widget_layouts")
    .select("id, name, is_active, breakpoint_config")
    .eq("user_id", user.id).eq("is_active", true).is("deleted_at", null)
    .maybeSingle();

  if (!layout) {
    const { data: created } = await supabase
      .from("widget_layouts")
      .insert({ user_id: user.id, name: "我的首頁", is_active: true })
      .select("id, name, is_active, breakpoint_config")
      .single();
    layout = created ?? null;
    if (layout) {
      const rows = defaultLayoutInstances().map((w) => ({ ...w, user_id: user.id, layout_id: layout!.id }));
      await supabase.from("widget_instances").insert(rows);
    }
  }

  const { data: instances } = layout
    ? await supabase
        .from("widget_instances")
        .select("id, layout_id, widget_type, position, config, hidden, locked")
        .eq("layout_id", layout.id)
    : { data: [] as any[] };

  const catalog = (Object.keys(WIDGET_REGISTRY) as WidgetId[]).map((id) => {
    const d = WIDGET_REGISTRY[id];
    return { id, name: d.name, category: d.category, description: d.description };
  });

  return (
    <HomeGrid
      userId={user.id}
      layout={layout as any}
      initialInstances={(instances ?? []) as WidgetInstance[]}
      catalog={catalog}
    />
  );
}
