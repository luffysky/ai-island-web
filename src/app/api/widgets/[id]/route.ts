import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getWidgetDefinition } from "@/lib/widgets/registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PATCH /api/widgets/[id] — 改 config（過 zod）/ hidden / locked。 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.config !== undefined) {
    // 讀該 instance 的 widget_type → 用其 zod schema 驗證 config
    const { data: inst } = await supabase.from("widget_instances").select("widget_type").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (!inst) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const def = getWidgetDefinition((inst as any).widget_type);
    if (def) {
      const parsed = def.configSchema.safeParse(body.config);
      patch.config = parsed.success ? parsed.data : def.defaultConfig;
    } else {
      patch.config = body.config;
    }
  }
  if (typeof body.hidden === "boolean") patch.hidden = body.hidden;
  if (typeof body.locked === "boolean") patch.locked = body.locked;

  const { data, error } = await supabase
    .from("widget_instances")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, widget_type, position, config, hidden, locked, layout_id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ widget: data });
}

/** DELETE /api/widgets/[id] — 移除一個 widget instance。 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase.from("widget_instances").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
