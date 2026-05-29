import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/me/resources?q=...&type=...&difficulty=...&language=...
 * 學員搜尋外部資源
 */
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const type = sp.get("type") ?? "";
  const difficulty = sp.get("difficulty") ?? "";
  const language = sp.get("language") ?? "";
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? 50)));

  const admin = createSupabaseAdmin();
  let query = admin.from("external_resources")
    .select("id, title, short_desc, long_desc, url, type, source, tags, topics, difficulty, language, is_free, curated_by, image_url")
    .eq("active", true);

  if (type) query = query.eq("type", type);
  if (difficulty) query = query.eq("difficulty", difficulty);
  if (language) query = query.eq("language", language);
  if (q) {
    const pattern = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(`title.ilike.${pattern},short_desc.ilike.${pattern},long_desc.ilike.${pattern}`);
  }

  const { data, error } = await query.order("position", { ascending: true }).limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ resources: data ?? [] });
}
