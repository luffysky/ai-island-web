import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase";
import { slugify } from "@/lib/blog-types";
import { parseBody } from "@/lib/validate";

const SettingsSchema = z.object({
  blog_title: z.string().max(200).nullable().optional(),
  blog_desc: z.string().max(2000).nullable().optional(),
  is_enabled: z.boolean().optional(),
  blog_slug: z.string().max(100).optional(),
});

// GET /api/blog/settings — 取自己的部落格設定
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let { data } = await supabase
    .from("user_blog_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // 沒有就建一個預設的
  if (!data) {
    const { data: created } = await supabase
      .from("user_blog_settings")
      .insert({ user_id: user.id })
      .select("*")
      .single();
    data = created;
  }

  return NextResponse.json({ settings: data });
}

// PATCH /api/blog/settings — 更新部落格設定
export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, SettingsSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as Record<string, any>;
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };

  if ("blog_title" in body) patch.blog_title = body.blog_title;
  if ("blog_desc" in body) patch.blog_desc = body.blog_desc;
  if ("is_enabled" in body) patch.is_enabled = body.is_enabled;

  // 自訂 slug：檢查全站不撞名
  if ("blog_slug" in body && body.blog_slug) {
    const wanted = slugify(body.blog_slug);
    const { data: taken } = await supabase
      .from("user_blog_settings")
      .select("user_id")
      .eq("blog_slug", wanted)
      .neq("user_id", user.id)
      .maybeSingle();
    if (taken) {
      return NextResponse.json({ error: "slug_taken", message: "這個網址已被使用" }, { status: 409 });
    }
    patch.blog_slug = wanted;
  }

  const { data, error } = await supabase
    .from("user_blog_settings")
    .upsert({ user_id: user.id, ...patch }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
